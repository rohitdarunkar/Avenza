import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Download, Plus, ShieldCheck } from "lucide-react";
import { auth } from "../firebase";
import useTransactions from "../hooks/useTransactions";
import TransactionForm from "../components/transactions/TransactionForm";
import TransactionFilters from "../components/transactions/TransactionFilters";
import TransactionSummary from "../components/transactions/TransactionSummary";
import TransactionTable from "../components/transactions/TransactionTable";
import {
  calculateTransactionSummary,
  filterTransactions,
  sortTransactions,
} from "../utils/transactionCalculations";
import "./transactions.css";

const INITIAL_FILTERS = {
  search: "",
  type: "all",
  category: "all",
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
};

function downloadCsv(transactions) {
  const columns = [
    ["Name", "name"],
    ["Amount", "amount"],
    ["Type", "type"],
    ["Category", "category"],
    ["Date", "date"],
    ["Notes", "notes"],
  ];
  const escapeCell = (value) => {
    const safe = String(value ?? "");
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const content = [
    columns.map(([label]) => escapeCell(label)).join(","),
    ...transactions.map((transaction) =>
      columns.map(([, key]) => escapeCell(transaction[key])).join(",")
    ),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `avenza-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Transactions({ user: suppliedUser, onBack, selectedAccountId = "all" }) {
  const [user, setUser] = useState(suppliedUser || auth.currentUser || null);
  const [authReady, setAuthReady] = useState(Boolean(suppliedUser || auth.currentUser));
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState("date-desc");
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    if (suppliedUser) {
      setUser(suppliedUser);
      setAuthReady(true);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, [suppliedUser]);

  const {
    transactions,
    loading,
    error,
    add,
    update,
    remove,
    clearError,
  } = useTransactions(user?.uid);

  const accountTransactions = useMemo(
    () => selectedAccountId === "all" ? transactions : transactions.filter((transaction) => transaction.accountId === selectedAccountId),
    [transactions, selectedAccountId]
  );

  const categories = useMemo(
    () => [...new Set(accountTransactions.map((transaction) => transaction.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [accountTransactions]
  );

  const visibleTransactions = useMemo(() => {
    const filtered = filterTransactions(accountTransactions, filters);
    return sortTransactions(filtered, sortBy);
  }, [accountTransactions, filters, sortBy]);

  const summary = useMemo(
    () => calculateTransactionSummary(visibleTransactions),
    [visibleTransactions]
  );

  const openCreateForm = () => {
    setEditingTransaction(null);
    setFormError("");
    setPageMessage("");
    setShowForm(true);
  };

  const openEditForm = (transaction) => {
    setEditingTransaction(transaction);
    setFormError("");
    setPageMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setShowForm(false);
    setEditingTransaction(null);
    setFormError("");
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setFormError("");
    setPageMessage("");
    clearError();

    try {
      if (editingTransaction) {
        await update(editingTransaction.id, values);
        setPageMessage("Transaction updated successfully.");
      } else {
        await add({ ...values, ...(selectedAccountId !== "all" ? { accountId: selectedAccountId } : {}) });
        setPageMessage("Transaction saved successfully.");
      }
      setShowForm(false);
      setEditingTransaction(null);
    } catch (submitError) {
      console.error("Avenza transaction form error:", submitError);
      setFormError(
        submitError?.code === "permission-denied"
          ? "Firebase denied this change. Check your Firestore security rules."
          : submitError?.message || "We couldn't save this transaction. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transaction) => {
    const confirmed = window.confirm(
      `Delete "${transaction.name}" (${transaction.type === "income" ? "income" : "expense"} of ₹${Number(transaction.amount).toLocaleString("en-IN")})? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(transaction.id);
    setPageMessage("");
    clearError();
    try {
      await remove(transaction.id);
      setPageMessage("Transaction deleted.");
    } catch (deleteError) {
      console.error("Avenza transaction delete error:", deleteError);
      setPageMessage(
        deleteError?.code === "permission-denied"
          ? "Firebase denied the deletion. Check your Firestore security rules."
          : deleteError?.message || "We couldn't delete this transaction."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleExport = () => {
    if (!visibleTransactions.length) {
      setPageMessage("There are no transactions in the current view to export.");
      return;
    }
    downloadCsv(visibleTransactions);
    setPageMessage(`Exported ${visibleTransactions.length} transaction${visibleTransactions.length === 1 ? "" : "s"} to CSV.`);
  };

  if (!authReady) {
    return (
      <main className="avtx-page">
        <div className="avtx-page-state"><span className="avtx-spinner" /> Checking your account…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="avtx-page">
        <div className="avtx-access-card">
          <div className="avtx-access-icon"><ShieldCheck size={25} /></div>
          <h1>Sign in to manage transactions</h1>
          <p>Your saved transactions are private to your Avenza account. Sign in to view, add, edit, and export them.</p>
          {onBack && <button className="avtx-button secondary" onClick={onBack}><ArrowLeft size={16} /> Back to dashboard</button>}
        </div>
      </main>
    );
  }

  return (
    <main className="avtx-page">
      <div className="avtx-page-inner">
        <header className="avtx-page-header">
          <div>
            <span className="avtx-eyebrow">YOUR FINANCIAL ACTIVITY</span>
            <h1>Transactions</h1>
            <p>Manage every income and expense in one place.</p>
          </div>
          <div className="avtx-header-actions">
            <button className="avtx-button secondary" onClick={handleExport} disabled={!visibleTransactions.length}>
              <Download size={16} /> Export CSV
            </button>
            <button className="avtx-button primary" onClick={openCreateForm}>
              <Plus size={17} /> Add transaction
            </button>
          </div>
        </header>

        <div className="avtx-privacy-note">
          <ShieldCheck size={16} />
          <span>Signed in as <strong>{user.email || "your Avenza account"}</strong>. Your transactions are loaded from your account.</span>
        </div>

        <div className="avtx-privacy-note" role="status">
          <ShieldCheck size={16} />
          {selectedAccountId === "all" ? (
            <span>
              <strong>All accounts view:</strong> you can see transactions across your accounts.
              New transactions created here will be saved to your default account.
            </span>
          ) : (
            <span>
              <strong>Selected account view:</strong> this page shows transactions for the selected account.
              New transactions created here will be saved to that account.
            </span>
          )}
        </div>

        {pageMessage && <div className="avtx-success-banner" role="status">{pageMessage}</div>}
        {error && <div className="avtx-error-banner" role="alert">{error}</div>}

        <TransactionSummary summary={summary} />

        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          categories={categories}
          sortBy={sortBy}
          onSortChange={setSortBy}
          resultCount={visibleTransactions.length}
          totalCount={transactions.length}
        />

        <section className="avtx-table-card">
          <div className="avtx-table-heading">
            <div>
              <h2>{selectedAccountId === "all" ? "All transactions" : "Account transactions"}</h2>
              <p>Your records update automatically when changes sync with Firebase.</p>
            </div>
            <span className="avtx-record-count">{visibleTransactions.length} shown</span>
          </div>
          <TransactionTable
            transactions={visibleTransactions}
            loading={loading}
            onEdit={openEditForm}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        </section>

        <p className="avtx-page-footnote">
          <ShieldCheck size={14} /> Financial records are private to the signed-in account. CSV export includes only the transactions currently shown.
        </p>
      </div>

      {showForm && (
        <div
          className="avtx-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section className="avtx-modal" role="dialog" aria-modal="true" aria-label={editingTransaction ? "Edit transaction" : "Add transaction"}>
            <TransactionForm
              initialTransaction={editingTransaction}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              submitting={submitting}
              error={formError}
            />
          </section>
        </div>
      )}
    </main>
  );
}
