import { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc,
} from "firebase/firestore";
import {
  ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, Plus,
  Target, Trash2, TrendingUp, Wallet,
} from "lucide-react";
import { db } from "../firebase";
import { formatCurrency } from "../utils/currency";
import "./goals.css";

const blankGoal = { name: "", targetAmount: "", savedAmount: "0", deadline: "", category: "Personal" };

function monthDiff(deadline) {
  if (!deadline) return 1;
  const end = new Date(`${deadline}T12:00:00`);
  const now = new Date();
  return Math.max(1, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth() + (end.getDate() >= now.getDate() ? 1 : 0));
}

export default function Goals({ user, transactions = [], onBack }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blankGoal);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contributionId, setContributionId] = useState("");
  const [contribution, setContribution] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setGoals([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const goalsRef = collection(db, "users", user.uid, "goals");
    const unsubscribe = onSnapshot(query(goalsRef, orderBy("createdAt", "desc")), (snapshot) => {
      setGoals(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
      setError("");
    }, (subscriptionError) => {
      setError(subscriptionError?.message || "Unable to load your goals.");
      setLoading(false);
    });
    return unsubscribe;
  }, [user?.uid]);

  const overview = useMemo(() => goals.reduce((acc, goal) => {
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const saved = Math.max(0, Number(goal.savedAmount) || 0);
    acc.target += target;
    acc.saved += Math.min(saved, target);
    return acc;
  }, { target: 0, saved: 0 }), [goals]);

  const addGoal = async (event) => {
    event.preventDefault();
    if (!user?.uid) return setError("Sign in to save your financial goals.");
    const targetAmount = Number(form.targetAmount);
    const savedAmount = Number(form.savedAmount || 0);
    if (!form.name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0 ||
        !Number.isFinite(savedAmount) || savedAmount < 0) {
      setError("Enter a goal name, a positive target, and a valid saved amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "users", user.uid, "goals"), {
        name: form.name.trim(),
        targetAmount,
        savedAmount: Math.min(savedAmount, targetAmount),
        deadline: form.deadline || "",
        category: form.category || "Personal",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm(blankGoal);
      setShowForm(false);
    } catch (saveError) {
      setError(saveError?.message || "Could not save this goal.");
    } finally {
      setSaving(false);
    }
  };

  const addContribution = async (goal) => {
    const amount = Number(contribution);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a contribution greater than zero.");
      return;
    }
    setError("");
    try {
      const nextSaved = Math.min(Number(goal.targetAmount) || 0, (Number(goal.savedAmount) || 0) + amount);
      await updateDoc(doc(db, "users", user.uid, "goals", goal.id), {
        savedAmount: nextSaved,
        updatedAt: serverTimestamp(),
      });
      setContribution("");
      setContributionId("");
    } catch (saveError) {
      setError(saveError?.message || "Could not update your contribution.");
    }
  };

  const removeGoal = async (goalId) => {
    if (!window.confirm("Delete this savings goal?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "goals", goalId));
    } catch (deleteError) {
      setError(deleteError?.message || "Could not delete this goal.");
    }
  };

  const monthlySurplus = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTransactions = transactions.filter((item) => String(item.date || "").startsWith(monthKey));
    const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenses = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return Math.max(0, income - expenses);
  }, [transactions]);

  return (
    <main className="avgo-page">
      <div className="avgo-inner">
        <button className="avgo-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to overview</button>
        <header className="avgo-header">
          <div><span className="avgo-eyebrow">MAKE YOUR MONEY MEAN SOMETHING</span><h1>Financial goals</h1><p>Turn the things you care about into achievable savings milestones.</p></div>
          <button className="avgo-primary" type="button" onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Create goal</button>
        </header>

        {error && <div className="avgo-error" role="alert">{error}</div>}

        <section className="avgo-summary">
          <article><span><Target size={17} /> Total target</span><strong>{formatCurrency(overview.target)}</strong><small>Across {goals.length} {goals.length === 1 ? "goal" : "goals"}</small></article>
          <article><span><Wallet size={17} /> Saved so far</span><strong>{formatCurrency(overview.saved)}</strong><small>{overview.target ? `${Math.round(overview.saved / overview.target * 100)}% of your combined target` : "Start with your first goal"}</small></article>
          <article><span><TrendingUp size={17} /> Monthly balance</span><strong>{formatCurrency(monthlySurplus)}</strong><small>Current month income minus expenses</small></article>
        </section>

        {showForm && <form className="avgo-form" onSubmit={addGoal}>
          <div className="avgo-form-heading"><div><span className="avgo-eyebrow">NEW MILESTONE</span><h2>Create a savings goal</h2></div><button type="button" className="avgo-close" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
          <div className="avgo-form-grid">
            <label>Goal name<input required maxLength="80" value={form.name} placeholder="e.g. Emergency fund" onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Target amount (₹)<input required min="1" type="number" value={form.targetAmount} placeholder="50000" onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} /></label>
            <label>Already saved (₹)<input min="0" type="number" value={form.savedAmount} onChange={(e) => setForm({ ...form, savedAmount: e.target.value })} /></label>
            <label>Target date<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
            <label>Goal type<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Personal</option><option>Emergency</option><option>Travel</option><option>Home</option><option>Education</option><option>Vehicle</option><option>Other</option></select></label>
          </div>
          <div className="avgo-form-actions"><button className="avgo-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="avgo-primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save goal"}</button></div>
        </form>}

        {loading ? <div className="avgo-state">Loading your goals…</div> : goals.length === 0 ? <section className="avgo-empty"><div><Target size={25} /></div><h2>Your next milestone starts here</h2><p>Create a savings goal, set a target date, and track your progress as you contribute.</p><button className="avgo-primary" type="button" onClick={() => setShowForm(true)}><Plus size={17} /> Create your first goal</button></section> : <section className="avgo-goal-grid">
          {goals.map((goal) => {
            const target = Math.max(0, Number(goal.targetAmount) || 0);
            const saved = Math.max(0, Number(goal.savedAmount) || 0);
            const remaining = Math.max(0, target - saved);
            const progress = target ? Math.min(100, Math.round(saved / target * 100)) : 0;
            const months = monthDiff(goal.deadline);
            const monthlyNeeded = remaining / months;
            return <article className="avgo-goal-card" key={goal.id}>
              <div className="avgo-goal-top"><span className="avgo-goal-icon"><CircleDollarSign size={19} /></span><span className="avgo-category">{goal.category || "Personal"}</span><button className="avgo-delete" type="button" onClick={() => removeGoal(goal.id)} aria-label={`Delete ${goal.name}`}><Trash2 size={15} /></button></div>
              <h2>{goal.name}</h2><div className="avgo-goal-amount"><strong>{formatCurrency(saved)}</strong><span>of {formatCurrency(target)}</span></div>
              <div className="avgo-progress" role="progressbar" aria-label={`${goal.name} progress`} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
              <div className="avgo-progress-meta"><span>{progress}% complete</span><span>{formatCurrency(remaining)} left</span></div>
              <div className="avgo-plan"><CalendarDays size={16} /><div><strong>{goal.deadline ? `Target ${new Date(`${goal.deadline}T12:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : "No target date"}</strong><small>{remaining ? `${formatCurrency(monthlyNeeded)} / month suggested` : "Goal reached — congratulations!"}</small></div></div>
              {remaining > 0 && <div className="avgo-contribution">{contributionId === goal.id ? <><input type="number" min="1" value={contribution} placeholder="Amount ₹" onChange={(e) => setContribution(e.target.value)} aria-label="Contribution amount" /><button type="button" onClick={() => addContribution(goal)}>Add</button><button type="button" className="avgo-cancel-contribution" onClick={() => { setContributionId(""); setContribution(""); }}>Cancel</button></> : <button type="button" className="avgo-contribute-button" onClick={() => { setContributionId(goal.id); setContribution(""); }}><Plus size={15} /> Add contribution</button>}</div>}
              {progress >= 100 && <div className="avgo-complete"><CheckCircle2 size={16} /> Goal completed</div>}
            </article>;
          })}
        </section>}
        <p className="avgo-note">Savings suggestions are estimates based on the remaining amount and target date. Goal contributions update this goal’s progress; they do not create a bank transaction.</p>
      </div>
    </main>
  );
}
