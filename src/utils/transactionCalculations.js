import { toFiniteNumber } from "./currency";
import { isDateWithinRange } from "./dates";

export function calculateTransactionSummary(transactions = []) {
  const summary = transactions.reduce(
    (totals, transaction) => {
      const amount = Math.max(0, toFiniteNumber(transaction?.amount));
      if (transaction?.type === "income") {
        totals.income += amount;
      } else if (transaction?.type === "expense") {
        totals.expenses += amount;
      }
      totals.count += 1;
      return totals;
    },
    { income: 0, expenses: 0, balance: 0, count: 0 }
  );

  summary.balance = summary.income - summary.expenses;
  summary.savingsRate =
    summary.income > 0
      ? ((summary.income - summary.expenses) / summary.income) * 100
      : null;

  return summary;
}

export function groupExpensesByCategory(transactions = []) {
  const grouped = new Map();

  transactions.forEach((transaction) => {
    if (transaction?.type !== "expense") return;
    const category = String(transaction.category || "Other").trim() || "Other";
    grouped.set(
      category,
      (grouped.get(category) || 0) + Math.max(0, toFiniteNumber(transaction.amount))
    );
  });

  const total = [...grouped.values()].reduce((sum, amount) => sum + amount, 0);

  return [...grouped.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function filterTransactions(transactions = [], filters = {}) {
  const {
    search = "",
    type = "all",
    category = "all",
    startDate = "",
    endDate = "",
    minAmount = "",
    maxAmount = "",
  } = filters;

  const normalizedSearch = search.trim().toLowerCase();
  const min = minAmount === "" ? null : Number(minAmount);
  const max = maxAmount === "" ? null : Number(maxAmount);

  return transactions.filter((transaction) => {
    const amount = toFiniteNumber(transaction.amount);
    const matchesSearch =
      !normalizedSearch ||
      [transaction.name, transaction.category, transaction.notes]
        .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
    const matchesType = type === "all" || transaction.type === type;
    const matchesCategory = category === "all" || transaction.category === category;
    const matchesDate = isDateWithinRange(transaction.date, startDate, endDate);
    const matchesMin = min === null || (Number.isFinite(min) && amount >= min);
    const matchesMax = max === null || (Number.isFinite(max) && amount <= max);

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesDate &&
      matchesMin &&
      matchesMax
    );
  });
}

export function sortTransactions(transactions = [], sortBy = "date-desc") {
  const sorted = [...transactions];
  const sorters = {
    "date-desc": (a, b) => String(b.date || "").localeCompare(String(a.date || "")),
    "date-asc": (a, b) => String(a.date || "").localeCompare(String(b.date || "")),
    "amount-desc": (a, b) => toFiniteNumber(b.amount) - toFiniteNumber(a.amount),
    "amount-asc": (a, b) => toFiniteNumber(a.amount) - toFiniteNumber(b.amount),
    "name-asc": (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
  };
  return sorted.sort(sorters[sortBy] || sorters["date-desc"]);
}

export function findPotentialDuplicates(transactions = []) {
  const seen = new Map();
  const duplicates = [];

  transactions.forEach((transaction, index) => {
    const key = [
      String(transaction.name || "").trim().toLowerCase(),
      toFiniteNumber(transaction.amount).toFixed(2),
      transaction.type || "expense",
      transaction.date || "",
      String(transaction.category || "").trim().toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      duplicates.push({
        transaction,
        duplicateOf: seen.get(key),
        index,
      });
    } else {
      seen.set(key, transaction);
    }
  });

  return duplicates;
}
