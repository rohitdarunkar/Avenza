import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Plus, PiggyBank, Trash2, Wallet, AlertTriangle } from "lucide-react";
import { db } from "../firebase";
import "../styles/budgets.css";

const CATEGORIES = ["Food", "Shopping", "Transport", "Bills", "Health", "Entertainment", "Education", "Travel", "Other"];
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function BudgetPage({ user, transactions = [], onBack }) {
  const [budgets, setBudgets] = useState([]);
  const [category, setCategory] = useState("Food");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) return undefined;
    return onSnapshot(collection(db, "users", user.uid, "budgets"), (snapshot) => {
      setBudgets(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setError("");
    }, (err) => {
      console.error("Budget subscription error:", err);
      setError("Could not load your budgets. Please check your connection.");
    });
  }, [user?.uid]);

  const spending = useMemo(() => {
    const totals = {};
    const currentMonth = monthKey();
    transactions.forEach((transaction) => {
      const date = String(transaction.date || "").slice(0, 7);
      if (date !== currentMonth || transaction.type === "income") return;
      const amount = Number(transaction.amount) || 0;
      const key = transaction.category || "Other";
      totals[key] = (totals[key] || 0) + amount;
    });
    return totals;
  }, [transactions]);

  const overallLimit = budgets.find((item) => item.category === "__overall__");
  const totalSpent = Object.values(spending).reduce((sum, amount) => sum + amount, 0);

  async function saveBudget(event) {
    event.preventDefault();
    const amount = Number(limit);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a monthly limit greater than zero.");
      return;
    }
    if (budgets.some((item) => item.category === category)) {
      setError(`A ${category} budget already exists. Remove it before adding a new limit.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "users", user.uid, "budgets"), {
        category, monthlyLimit: amount, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setLimit("");
    } catch (err) {
      console.error("Unable to save budget:", err);
      setError("Unable to save this budget. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(id) {
    try {
      await deleteDoc(doc(db, "users", user.uid, "budgets", id));
    } catch (err) {
      console.error("Unable to delete budget:", err);
      setError("Unable to remove this budget. Please try again.");
    }
  }

  const cards = budgets.map((budget) => {
    const spent = budget.category === "__overall__" ? totalSpent : spending[budget.category] || 0;
    const percentage = Math.round((spent / Math.max(Number(budget.monthlyLimit) || 1, 1)) * 100);
    return { ...budget, spent, percentage, remaining: Number(budget.monthlyLimit) - spent };
  });

  return (
    <main className="budgets-page">
      <header className="budgets-header">
        <button className="budgets-back" onClick={onBack}><ArrowLeft size={17} /> Back to overview</button>
        <div className="budgets-title-row">
          <div className="budgets-title-icon"><PiggyBank size={24} /></div>
          <div><span className="budgets-eyebrow">Spend with intention</span><h1>Smart budgets</h1><p>Set monthly limits and keep your spending on track.</p></div>
        </div>
      </header>

      <section className="budgets-overview">
        <article><span><Wallet size={16}/> Total spent this month</span><strong>{money(totalSpent)}</strong><small>Across recorded expense categories</small></article>
        <article><span><PiggyBank size={16}/> Active budgets</span><strong>{budgets.length}</strong><small>Monthly spending limits</small></article>
        <article className={overallLimit && totalSpent > Number(overallLimit.monthlyLimit) ? "budget-alert-card" : ""}><span><AlertTriangle size={16}/> Overall status</span><strong>{overallLimit ? `${Math.round(totalSpent / Math.max(Number(overallLimit.monthlyLimit), 1) * 100)}% used` : "Not set"}</strong><small>{overallLimit ? `${money(Number(overallLimit.monthlyLimit) - totalSpent)} ${totalSpent > Number(overallLimit.monthlyLimit) ? "over budget" : "remaining"}` : "Add an overall limit to track total expenses"}</small></article>
      </section>

      <section className="budgets-form-panel">
        <div><span className="budgets-eyebrow">Create a spending limit</span><h2>Set a monthly budget</h2><p>Budgets use your saved transactions for the current calendar month.</p></div>
        <form onSubmit={saveBudget}>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Monthly limit (₹)<input type="number" min="1" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="e.g. 8000" /></label>
          <button type="submit" disabled={saving}><Plus size={17}/>{saving ? "Saving…" : "Add budget"}</button>
        </form>
        {error && <p className="budgets-error" role="alert">{error}</p>}
      </section>

      <section className="budgets-list-section">
        <div className="budgets-section-heading"><div><span className="budgets-eyebrow">Current month</span><h2>Your budgets</h2></div><span>{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span></div>
        {cards.length ? <div className="budgets-grid">{cards.map((item) => <article className="budget-card" key={item.id}>
          <div className="budget-card-top"><div><span className="budget-category-icon"><PiggyBank size={18}/></span><strong>{item.category === "__overall__" ? "Overall spending" : item.category}</strong></div><button aria-label={`Delete ${item.category} budget`} onClick={() => removeBudget(item.id)}><Trash2 size={16}/></button></div>
          <div className="budget-numbers"><strong>{money(item.spent)}</strong><span>of {money(item.monthlyLimit)}</span></div>
          <div className="budget-progress-track"><div className={`budget-progress-fill ${item.percentage >= 100 ? "over" : item.percentage >= 80 ? "near" : ""}`} style={{ width: `${Math.min(item.percentage, 100)}%` }}/></div>
          <div className="budget-card-footer"><span>{item.percentage}% used</span><span className={item.remaining < 0 ? "budget-over-text" : ""}>{item.remaining < 0 ? `${money(Math.abs(item.remaining))} over limit` : `${money(item.remaining)} left`}</span></div>
          {item.percentage >= 100 ? <p className="budget-status danger">You've exceeded this budget.</p> : item.percentage >= 80 ? <p className="budget-status warning">You're approaching this limit.</p> : <p className="budget-status">You're within your monthly limit.</p>}
        </article>)}</div> : <div className="budgets-empty"><PiggyBank size={30}/><strong>No budgets yet</strong><p>Create a category budget above to see progress and spending alerts here.</p></div>}
      </section>
    </main>
  );
}
