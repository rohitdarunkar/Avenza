
import {
  ArrowLeft,
  Bot,
  Clock3,
  Download,
  MessageSquarePlus,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  Pin,
  Pencil,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/ai.css";
import ChatWindow from "../components/ai/ChatWindow";
import {
  askAvenzaAI,
  deleteAIConversation,
  listAIConversations,
  saveAIConversation,
  summarizeTransactions,
  updateAIConversationMetadata,
} from "../services/aiService";
import { formatCurrency } from "../utils/currency";
import { exportAIReport } from "../utils/exportAIReport";

const ACTIVE_CHAT_KEY = "avenza-ai-active-chat";

const starterMessage = {
  id: "avenza-welcome",
  role: "assistant",
  content:
    "Hi, I'm Avenza AI. I can help you understand the transactions available in your workspace, identify spending patterns, and explore practical savings ideas. What would you like to know?",
};

function makeMessage(role, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function AIAssistant({
  user = null,
  transactions = [],
  onBack,
}) {
  const [messages, setMessages] = useState([starterMessage]);
  const [conversationId, setConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] =
    useState("New conversation");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const [notice, setNotice] = useState("");
  const sortedHistory = useMemo(() => [...history].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || ((b.updatedAt?.toMillis?.() || new Date(b.updatedAt || 0).getTime()) - (a.updatedAt?.toMillis?.() || new Date(a.updatedAt || 0).getTime()))), [history]);

  const summary = useMemo(
    () => summarizeTransactions(transactions),
    [transactions]
  );

  const refreshHistory = useCallback(async () => {
    if (!user?.uid) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);

    try {
      const items = await listAIConversations(user.uid);
      setHistory(items);
    } catch (loadError) {
      console.error("Unable to load Avenza AI history:", loadError);
      setNotice(
        "Conversation history couldn't be loaded. Check your Firestore rules and connection."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // A floating companion can hand off its active chat through sessionStorage.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("avenza-ai-assistant-handoff");
      if (!raw) return;
      const handoff = JSON.parse(raw);
      sessionStorage.removeItem("avenza-ai-assistant-handoff");
      if (!handoff || !Array.isArray(handoff.messages)) return;
      setConversationId(handoff.conversationId || null);
      setConversationTitle(handoff.conversationTitle || "New conversation");
      setMessages(handoff.messages.length ? handoff.messages : [starterMessage]);
      try {
        localStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify({
          conversationId: handoff.conversationId || null,
          conversationTitle: handoff.conversationTitle || "New conversation",
          messages: handoff.messages.length ? handoff.messages : [starterMessage],
        }));
      } catch {}
      setError("");
      setNotice("");
    } catch (handoffError) {
      console.warn("Unable to restore the floating AI conversation:", handoffError);
    }
  }, []);

  // Keep the current chat recoverable when navigating back to Overview.
  useEffect(() => {
    try {
      const activeChat = { conversationId, conversationTitle, messages };
      localStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify(activeChat));
      window.dispatchEvent(new CustomEvent("avenza-ai-active-chat-updated", {
        detail: { ...activeChat, source: "assistant" },
      }));
    } catch {}
  }, [conversationId, conversationTitle, messages]);

  const startNewConversation = () => {
    setConversationId(null);
    setConversationTitle("New conversation");
    setMessages([starterMessage]);
    setError("");
    setNotice("");
  };

  const openConversation = (item) => {
    setConversationId(item.id);
    setConversationTitle(item.title || "Saved conversation");
    setMessages(
      Array.isArray(item.messages) && item.messages.length
        ? item.messages
        : [starterMessage]
    );
    setError("");
    setNotice("");
  };

  const sendMessage = async (question) => {
    if (!question?.trim() || loading) return;

    const userMessage = makeMessage("user", question.trim());
    const priorMessages = messages.filter(
      (message) => message.id !== starterMessage.id
    );
    const nextMessages = [...priorMessages, userMessage];

    setMessages(nextMessages);
    setLoading(true);
    setError("");
    setFailedQuestion("");
    setNotice("");

    try {
      const lastCompletedAssistant = priorMessages.findLastIndex(
        (message) => message.role === "assistant"
      );

      const modelHistory =
        lastCompletedAssistant >= 0
          ? priorMessages.slice(0, lastCompletedAssistant + 1)
          : [];

      const response = await askAvenzaAI({
        question: userMessage.content,
        transactions,
        history: modelHistory,
      });

      const assistantMessage = {
        ...makeMessage("assistant", response.content),
        ...(response.chartSpec ? { chartSpec: response.chartSpec } : {}),
      };

      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      setFailedQuestion("");

      const nextTitle =
        conversationTitle === "New conversation"
          ? question.trim().slice(0, 58)
          : conversationTitle;

      setConversationTitle(nextTitle);

      if (user?.uid) {
        try {
          const id = await saveAIConversation(user.uid, {
            id: conversationId,
            title: nextTitle,
            messages: finalMessages,
          });

          if (id) setConversationId(id);

          await refreshHistory();
        } catch (saveError) {
          console.error(
            "Unable to save Avenza AI conversation:",
            saveError
          );

          setNotice(
            "Answer received, but this conversation couldn't be saved. Check Firestore rules."
          );
        }
      }
    } catch (requestError) {
      setFailedQuestion(userMessage.content);
      setError(
        requestError?.message ||
          "Avenza AI couldn't answer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const removeConversation = async (item, event) => {
    event.stopPropagation();

    if (
      !user?.uid ||
      !window.confirm(
        "Delete this saved AI conversation? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteAIConversation(user.uid, item.id);

      if (conversationId === item.id) {
        startNewConversation();
      }

      await refreshHistory();
    } catch (deleteError) {
      setNotice(
        deleteError?.message || "Couldn't delete this conversation."
      );
    }
  };

  const updateConversationMetadata = async (item, changes) => {
    if (!user?.uid) return;
    try {
      await updateAIConversationMetadata(user.uid, item.id, changes);
      await refreshHistory();
      if (conversationId === item.id && changes.title) setConversationTitle(changes.title);
    } catch (updateError) {
      setNotice(updateError?.message || "Couldn't update this conversation.");
    }
  };

  const renameConversation = (item, event) => {
    event.stopPropagation();
    const nextTitle = window.prompt("Rename conversation", item.title || "Saved conversation");
    if (nextTitle?.trim() && nextTitle.trim() !== item.title) {
      updateConversationMetadata(item, { title: nextTitle.trim().slice(0, 80) });
    }
  };

  const togglePinned = (item, event) => {
    event.stopPropagation();
    updateConversationMetadata(item, { pinned: !item.pinned });
  };

  const expenses = summary.expenseTotal;
  const net = summary.netCashFlow;

  const handleExportReport = () => {
    try {
      exportAIReport({ summary, messages });
      setNotice("");
    } catch (exportError) {
      setNotice(exportError?.message || "Couldn't open the report. Please allow pop-ups and try again.");
    }
  };

  return (
    <div className="avenza-ai-page">
      <div className="avenza-ai-heading">
        <div>
          <button
            className="ai-back-button"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            Back to overview
          </button>

          <div className="ai-heading-title">
            <span className="ai-heading-mark">
              <Sparkles size={22} />
            </span>

            <div>
              <span className="ai-kicker">AVENZA INTELLIGENCE</span>
              <h1>Your AI money assistant</h1>
            </div>
          </div>

          <p>
            Ask clearer questions. Find patterns. Make more confident
            money decisions.
          </p>
        </div>

        <div className="ai-heading-actions">
          <button
            className="ai-export-button"
            type="button"
            onClick={handleExportReport}
            title="Open a printable report that can be saved as PDF"
          >
            <Download size={16} />
            Export report
          </button>
          <button
            className="ai-new-chat-button"
            type="button"
            onClick={startNewConversation}
          >
            <Plus size={17} />
            New chat
          </button>
        </div>
      </div>

      <div className="ai-summary-strip">
        <div>
          <span>
            <Wallet size={15} />
            Recorded expenses
          </span>
          <strong>{formatCurrency(expenses)}</strong>
        </div>

        <div>
          <span>
            <Sparkles size={15} />
            Net cash flow
          </span>
          <strong className={net < 0 ? "ai-negative" : ""}>
            {formatCurrency(net)}
          </strong>
        </div>

        <div>
          <span>
            <Clock3 size={15} />
            Transactions analysed
          </span>
          <strong>{summary.transactionCount}</strong>
        </div>
      </div>

      <section className="ai-spending-breakdown" aria-labelledby="ai-spending-title">
        <div className="ai-spending-heading">
          <div>
            <span className="ai-kicker">WHERE YOUR MONEY GOES</span>
            <h2 id="ai-spending-title">Spending breakdown</h2>
          </div>
          <span className="ai-spending-total">{formatCurrency(expenses)} total</span>
        </div>

        {summary.categoryTotals.length ? (
          <div className="ai-category-grid">
            {summary.categoryTotals.slice(0, 6).map((item) => {
              const percentage = expenses > 0
                ? Math.min(100, Math.max(0, (item.amount / expenses) * 100))
                : 0;

              return (
                <article className="ai-category-card" key={item.category}>
                  <div className="ai-category-card-top">
                    <span className="ai-category-name">{item.category}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                  <div
                    className="ai-category-progress"
                    role="progressbar"
                    aria-label={`${item.category} share of expenses`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Number(percentage.toFixed(1))}
                  >
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="ai-category-meta">
                    <span>Share of expenses</span>
                    <strong>{percentage.toFixed(1)}%</strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ai-category-empty">Add expense transactions to see your category breakdown here.</p>
        )}
        <p className="ai-breakdown-footnote">Calculated from recorded expense transactions in this workspace.</p>
      </section>

      <div className="ai-workspace">
        {user && (
          <aside className="ai-history-panel">
            <div className="ai-history-heading">
              <span>Recent chats</span>
              <button
                type="button"
                onClick={startNewConversation}
                aria-label="Start a new chat"
              >
                <MessageSquarePlus size={17} />
              </button>
            </div>

            {historyLoading ? (
              <p className="ai-history-empty">
                Loading conversations…
              </p>
            ) : history.length ? (
              sortedHistory.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`ai-history-item ${conversationId === item.id ? "active" : ""}`}
                  onClick={() => openConversation(item)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openConversation(item);
                    }
                  }}
                >
                  <span className="ai-history-item-icon">
                    <Bot size={16} />
                  </span>

                  <span className="ai-history-item-copy">
                    <strong>
                      {item.title || "Saved conversation"}
                    </strong>
                    <small>
                      {Array.isArray(item.messages)
                        ? `${item.messages.length} messages`
                        : "Conversation"}
                    </small>
                  </span>

                  <span className="ai-history-actions">
                    <button type="button" className={`ai-history-action ${item.pinned ? "is-pinned" : ""}`} aria-label={item.pinned ? "Unpin conversation" : "Pin conversation"} title={item.pinned ? "Unpin conversation" : "Pin conversation"} onClick={(event) => togglePinned(item, event)}>
                      <Pin size={13} />
                    </button>
                    <button type="button" className="ai-history-action" aria-label="Rename conversation" title="Rename conversation" onClick={(event) => renameConversation(item, event)}>
                      <Pencil size={13} />
                    </button>
                  </span>
                  <button
                    type="button"
                    className="ai-history-delete"
                    aria-label="Delete conversation"
                    onClick={(event) => removeConversation(item, event)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="ai-history-empty">
                Your saved conversations will appear here.
              </p>
            )}

            <div className="ai-history-secure">
              <ShieldCheck size={16} />
              <span>
                Conversation history is stored under your account.
              </span>
            </div>
          </aside>
        )}

        <div className="ai-main-column">
          {!user && (
            <div className="ai-guest-notice">
              <Sparkles size={16} />
              <span>
                You're exploring with demo data. Sign in to save
                conversations and analyse your own saved transactions.
              </span>
            </div>
          )}

          {notice && (
            <div className="ai-notice" role="status">
              {notice}
            </div>
          )}

          {error && (
            <div className="ai-error" role="alert">
              <strong>Couldn't get an answer</strong>
              <span>{error}</span>
              {failedQuestion && (
                <button
                  type="button"
                  className="ai-error-retry"
                  disabled={loading}
                  onClick={() => sendMessage(failedQuestion)}
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={() => { setError(""); setFailedQuestion(""); }}
              >
                Dismiss
              </button>
            </div>
          )}

          <ChatWindow
            messages={messages.filter(
              (message) => message.id !== starterMessage.id
            )}
            onSend={sendMessage}
            loading={loading}
            disabled={false}
            hasMessages={messages.some(
              (message) => message.id !== starterMessage.id
            )}
          />

          <div className="ai-privacy-note">
            <ShieldCheck size={15} />
            <span>
              Answers use the transaction data available in this
              workspace. Check important calculations before acting.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

