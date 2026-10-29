import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import app, { db } from "../firebase";

const MODEL_NAME = "gemini-3.5-flash-lite";

function getModel() {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: MODEL_NAME,
    generationConfig: { temperature: 0.25, maxOutputTokens: 1200 },
  });
}

function cleanTransactions(transactions = []) {
  return transactions.map((item) => ({
    name: String(item.name || item.description || "Transaction").slice(0, 100),
    type: item.type === "income" ? "income" : "expense",
    category: String(item.category || "Other").slice(0, 60),
    amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
    date: String(item.date || ""),
  })).filter((item) => item.date && item.amount >= 0);
}

export function summarizeTransactions(transactions = []) {
  const rows = cleanTransactions(transactions);
  const expenses = rows.filter((item) => item.type === "expense");
  const income = rows.filter((item) => item.type === "income");
  const sum = (items) => items.reduce((total, item) => total + item.amount, 0);
  const categories = {};
  expenses.forEach((item) => { categories[item.category] = (categories[item.category] || 0) + item.amount; });
  const categoryTotals = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const months = {};
  const monthlyCategoryExpenses = {};
  rows.forEach((item) => {
    const month = item.date.slice(0, 7);
    if (!months[month]) months[month] = { income: 0, expenses: 0 };
    months[month][item.type === "income" ? "income" : "expenses"] += item.amount;
    if (item.type === "expense") {
      if (!monthlyCategoryExpenses[month]) monthlyCategoryExpenses[month] = {};
      monthlyCategoryExpenses[month][item.category] =
        (monthlyCategoryExpenses[month][item.category] || 0) + item.amount;
    }
  });

  // Compare the newest month against prior recorded months, category by category.
  // Require two prior months and a material increase to avoid unsupported flags.
  const monthKeys = Object.keys(monthlyCategoryExpenses).sort();
  const latestMonth = monthKeys[monthKeys.length - 1] || null;
  const priorMonths = latestMonth ? monthKeys.slice(0, -1) : [];
  const spendingAnomalies = [];
  if (latestMonth && priorMonths.length >= 2) {
    const latestCategories = monthlyCategoryExpenses[latestMonth] || {};
    Object.entries(latestCategories).forEach(([category, currentAmount]) => {
      const historicalAmounts = priorMonths.map((month) =>
        monthlyCategoryExpenses[month]?.[category] || 0
      );
      const baseline = historicalAmounts.reduce((total, amount) => total + amount, 0) / historicalAmounts.length;
      const increase = currentAmount - baseline;
      const increasePercent = baseline > 0 ? (increase / baseline) * 100 : null;
      // For previously unrecorded categories, don't infer a percentage spike.
      if (baseline > 0 && currentAmount >= baseline * 1.3 && increase >= 500) {
        spendingAnomalies.push({
          category,
          month: latestMonth,
          currentAmount,
          historicalAverage: baseline,
          increaseAmount: increase,
          increasePercent: increasePercent,
          comparisonMonths: priorMonths,
          reason: "Category spending is at least 30% and ₹500 above its prior-month average.",
        });
      }
    });
  }
  return {
    transactionCount: rows.length,
    incomeTotal: sum(income),
    expenseTotal: sum(expenses),
    netCashFlow: sum(income) - sum(expenses),
    categoryTotals: categoryTotals.map(([category, amount]) => ({ category, amount })),
    spendingAnomalies,
    anomalyAnalysis: {
      latestMonth,
      comparisonMonths: priorMonths,
      baselineMonthsRequired: 2,
      status: priorMonths.length >= 2 ? (spendingAnomalies.length ? "flags_found" : "no_material_spikes_found") : "insufficient_history",
    },
    monthlyTotals: Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, totals]) => ({ month, ...totals, net: totals.income - totals.expenses })),
    transactions: rows.slice(0, 250),
  };
}

// Lightweight typo-tolerant intent matching for common finance/visualization words.
// This keeps chart intent detection local and deterministic instead of depending
// on Gemini to explicitly request a chart in its prose.
function normalizeIntentText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9₹]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function editDistanceAtMostOne(left, right) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    let differences = 0;
    for (let i = 0; i < left.length; i += 1) {
      if (left[i] !== right[i]) differences += 1;
      if (differences > 1) return false;
    }
    return true;
  }
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
    } else {
      edits += 1;
      j += 1;
      if (edits > 1) return false;
    }
  }
  return true;
}

function hasIntentWord(tokens, expectedWords) {
  return tokens.some((token) => expectedWords.some((expected) =>
    token === expected || (expected.length >= 5 && token.length >= 5 && editDistanceAtMostOne(token, expected))
  ));
}

function buildChartSpec(question, summary) {
  const tokens = normalizeIntentText(question);
  const has = (words) => hasIntentWord(tokens, words);
  const asksComparison =
    has(["compare", "comparison", "versus", "vs", "difference", "change"]) ||
    (has(["month", "monthly"]) && has(["last", "previous", "prior", "between"]));
  const asksSavings = has(["save", "saving", "savings", "reduce", "cut", "lower"]) &&
    has(["where", "how", "help", "suggest", "recommend", "plan", "spending", "expenses", "expense", "money"]);
  const asksForVisual =
    has(["chart", "graph", "plot", "visual", "visualize", "visualise", "vizualize", "vizualise", "show", "display", "draw", "breakdown", "distribution", "trend", "compare"]) &&
    has(["spending", "expense", "expenses", "income", "cashflow", "category", "categories", "money", "finance", "financial", "transaction", "transactions", "budget", "month", "monthly", "saving", "savings", "visual", "chart", "graph", "plot", "breakdown", "distribution", "trend"]);
  const asksForSpendingView =
    has(["spending", "expense", "expenses", "cost", "costs", "income", "cashflow", "money", "budget"]) &&
    has(["show", "visual", "visualize", "visualise", "vizualize", "vizualise", "chart", "graph", "plot", "breakdown", "distribution", "display", "draw", "see", "view", "summarize", "summary"]);
  const asksMonthly = has(["month", "monthly", "trend", "year", "history"]) ||
    (tokens.includes("over") && tokens.includes("time"));

  // Comparison intent gets a deterministic visual from the two latest available months.
  if ((asksComparison || asksMonthly) && summary.monthlyTotals.length >= 2) {
    const data = summary.monthlyTotals.slice(-2).map((item) => ({
      label: item.month,
      income: item.income,
      expenses: item.expenses,
      net: item.net,
    }));
    return {
      type: "monthly",
      title: asksComparison ? "Latest month comparison" : "Monthly cash flow",
      data,
    };
  }

  // Smart-savings questions can use the actual category totals as a grounded
  // starting point for recommendations, even when the user didn't say "chart".
  if (asksSavings && summary.categoryTotals.length) {
    return {
      type: "categories",
      title: "Where savings may be possible",
      data: summary.categoryTotals.slice(0, 8).map((item) => ({ label: item.category, value: item.amount })),
    };
  }

  if (!asksForVisual && !asksForSpendingView) return null;

  if (asksMonthly && summary.monthlyTotals.length) {
    return {
      type: "monthly",
      title: "Monthly cash flow",
      data: summary.monthlyTotals.slice(-12).map((item) => ({ label: item.month, income: item.income, expenses: item.expenses, net: item.net })),
    };
  }

  if (summary.categoryTotals.length) {
    return {
      type: "categories",
      title: "Expense categories",
      data: summary.categoryTotals.slice(0, 8).map((item) => ({ label: item.category, value: item.amount })),
    };
  }

  if (summary.monthlyTotals.length) {
    return {
      type: "monthly",
      title: "Monthly cash flow",
      data: summary.monthlyTotals.slice(-12).map((item) => ({ label: item.month, income: item.income, expenses: item.expenses, net: item.net })),
    };
  }
  return null;
}

export async function askAvenzaAI({ question, transactions, history = [] }) {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) throw new Error("Enter a question first.");
  const summary = summarizeTransactions(transactions);
  const conversation = history.slice(-8).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.content || "").slice(0, 3000) }],
  }));
  const model = getModel();
  const chat = model.startChat({ history: conversation });
  const prompt = `You are Avenza AI, a careful personal-finance assistant inside a finance tracker. Answer using only the supplied transaction data. Do not invent transactions, balances, dates, or facts. If the data does not cover a requested period, clearly say so. Distinguish recorded facts from estimates and recommendations. Use INR (₹), concise headings and readable bullets. Always format rupee amounts with Indian digit grouping (for example, ₹3,11,888.50); do not output malformed grouping such as ₹3,11888.50. You are not a licensed financial adviser; avoid guaranteeing investment outcomes. For calculations, use the provided summary and transaction rows; if data is insufficient, ask a clarifying question. For monthly comparison requests, compare the supplied monthlyTotals and clearly state the exact months and percentage change when calculable. For unusual-spending/anomaly questions, use the supplied anomalyAnalysis and spendingAnomalies. A flag is a statistical spending pattern, not proof of fraud. If anomalyAnalysis.status is "insufficient_history", state how many comparison months are available and that no reliable baseline can be established; do not say spending is normal or claim a detected anomaly. If there are no flags after sufficient history, say no material category spikes met the rule, not that spending is definitively normal. For savings requests, identify the largest expense categories from recorded categoryTotals and calculate illustrative reductions only when the requested percentage or amount is clear. Use recorded income, expenses, and category totals where available; clearly label estimates and hypothetical reductions, do not assume every transaction is recurring, and explain when the available data is insufficient to support a monthly target. If the user asks something unrelated to their finances, you may answer briefly but bring the conversation back to their financial goals.\n\nUSER DATA SUMMARY (JSON):\n${JSON.stringify(summary)}\n\nUSER QUESTION:\n${cleanQuestion}`;
  try {
    let result;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        result = await chat.sendMessage(prompt);
        break;
      } catch (requestError) {
        const message = String(requestError?.message || "").toLowerCase();
        const code = String(requestError?.code || "").toLowerCase();
        const isTemporary =
          /\b(429|500|502|503|504)\b/.test(message) ||
          message.includes("deadline") ||
          message.includes("timeout") ||
          message.includes("timed out") ||
          message.includes("high demand") ||
          message.includes("temporarily unavailable") ||
          message.includes("unavailable") ||
          code.includes("unavailable") ||
          code.includes("deadline-exceeded");

        if (!isTemporary || attempt === maxRetries) {
          throw requestError;
        }

        // Short exponential backoff: 900 ms, then 1.8 seconds.
        await new Promise((resolve) =>
          setTimeout(resolve, 900 * (2 ** attempt))
        );
      }
    }

    const text = result?.response?.text()?.trim();
    if (!text) {
      throw new Error("Avenza AI returned an empty response. Please try again.");
    }

    return { content: text, summary, chartSpec: buildChartSpec(cleanQuestion, summary) };
  } catch (error) {
    if (error?.message?.includes("API key") || error?.message?.includes("not enabled") || error?.code === "ai/unsupported-api-key") {
      throw new Error("Avenza AI isn't enabled for this Firebase project yet. Enable Firebase AI Logic in the Firebase console, then try again.");
    }
    if (error?.code === "permission-denied") {
      throw new Error("Firebase denied this AI request. Check Firebase AI Logic setup and your app configuration.");
    }

    const errorMessage = String(error?.message || "");
    if (
      /\b(429|500|502|503|504)\b/.test(errorMessage) ||
      /deadline|timeout|timed out|high demand|temporarily unavailable|unavailable/i.test(errorMessage)
    ) {
      throw new Error(
        "Gemini is temporarily busy or unavailable. Avenza tried again automatically, but couldn't get a response. Please wait a moment and try again."
      );
    }

    throw new Error(errorMessage || "Avenza AI could not respond. Check your connection and try again.");
  }
}

function conversationsCollection(userId) {
  if (!userId) throw new Error("Sign in to access saved AI conversations.");
  return collection(db, "users", userId, "aiConversations");
}

export async function listAIConversations(userId) {
  const snapshot = await getDocs(query(conversationsCollection(userId), orderBy("updatedAt", "desc"), limit(20)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveAIConversation(userId, conversation) {
  if (!userId) return null;
  const messages = (conversation.messages || []).slice(-40).map((message) => ({
    id: String(message.id || `${Date.now()}-${Math.random()}`),
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || "").slice(0, 5000),
    ...(message.chartSpec ? { chartSpec: message.chartSpec } : {}),
    createdAt: message.createdAt || new Date().toISOString(),
  }));
  const payload = {
    title: String(conversation.title || "New conversation").slice(0, 100),
    messages,
    updatedAt: serverTimestamp(),
    ...(conversation.pinned !== undefined ? { pinned: Boolean(conversation.pinned) } : {}),
  };
  if (conversation.id) {
    await updateDoc(doc(db, "users", userId, "aiConversations", conversation.id), payload);
    return conversation.id;
  }
  const ref = await addDoc(conversationsCollection(userId), { ...payload, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateAIConversationMetadata(userId, conversationId, changes = {}) {
  if (!userId || !conversationId) throw new Error("A saved conversation is required.");

  const updates = { updatedAt: serverTimestamp() };
  if (changes.title !== undefined) {
    const title = String(changes.title || "Saved conversation").trim().slice(0, 100);
    if (!title) throw new Error("Conversation title cannot be empty.");
    updates.title = title;
  }
  if (changes.pinned !== undefined) updates.pinned = Boolean(changes.pinned);

  await updateDoc(doc(db, "users", userId, "aiConversations", conversationId), updates);
}

export async function deleteAIConversation(userId, conversationId) {
  if (!userId || !conversationId) throw new Error("A saved conversation is required.");
  await deleteDoc(doc(db, "users", userId, "aiConversations", conversationId));
}
