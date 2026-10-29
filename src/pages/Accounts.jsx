import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { ArrowLeft, Check, CreditCard, Landmark, Plus, Trash2, Wallet, X } from "lucide-react";
import { db } from "../firebase";
import "./accounts.css";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank account" },
  { value: "savings", label: "Savings account" },
  { value: "credit-card", label: "Credit card" },
  { value: "cash", label: "Cash wallet" },
  { value: "investment", label: "Investment account" },
  { value: "other", label: "Other" },
];

const emptyForm = { name: "", type: "bank", institution: "", last4: "", notes: "" };

function accountCollection(userId) {
  return collection(db, "users", userId, "accounts");
}

function transactionCollection(userId) {
  return collection(db, "users", userId, "transactions");
}

export default function AccountsPage({ user, onBack }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setAccounts([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return onSnapshot(
      query(accountCollection(user.uid)),
      async (snapshot) => {
        const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setAccounts(next.sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || String(a.name).localeCompare(String(b.name))));
        setLoading(false);
        if (snapshot.empty) {
          try {
            await addDoc(accountCollection(user.uid), {
              name: "Default Account",
              type: "other",
              institution: "",
              last4: "",
              notes: "Automatically created to preserve existing Avenza transactions.",
              isDefault: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (createError) {
            setError(createError?.message || "Unable to create the default account.");
          }
        }
      },
      (loadError) => {
        setError(loadError?.message || "Unable to load accounts.");
        setLoading(false);
      }
    );
  }, [user?.uid]);

  const defaultAccount = useMemo(() => accounts.find((account) => account.isDefault) || accounts[0], [accounts]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setShowForm(false);
  };

  const startEdit = (account) => {
    setEditingId(account.id);
    setForm({
      name: account.name || "",
      type: account.type || "other",
      institution: account.institution || "",
      last4: account.last4 || "",
      notes: account.notes || "",
    });
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    if (!user?.uid) return;
    const name = form.name.trim();
    if (!name) {
      setError("Enter a name for this account.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const data = {
      name: name.slice(0, 80),
      type: form.type,
      institution: form.institution.trim().slice(0, 100),
      last4: form.last4.replace(/\D/g, "").slice(-4),
      notes: form.notes.trim().slice(0, 300),
      updatedAt: serverTimestamp(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "users", user.uid, "accounts", editingId), data);
        setMessage("Account updated.");
      } else {
        await addDoc(accountCollection(user.uid), { ...data, isDefault: accounts.length === 0, createdAt: serverTimestamp() });
        setMessage("Account created.");
      }
      resetForm();
    } catch (saveError) {
      setError(saveError?.message || "Unable to save this account.");
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (account) => {
    if (!user?.uid || account.isDefault) return;
    setError("");
    try {
      const batch = writeBatch(db);
      accounts.forEach((item) => batch.update(doc(db, "users", user.uid, "accounts", item.id), { isDefault: item.id === account.id, updatedAt: serverTimestamp() }));
      await batch.commit();
      setMessage(`${account.name} is now the default account.`);
    } catch (operationError) {
      setError(operationError?.message || "Unable to change the default account.");
    }
  };

  const removeAccount = async (account) => {
    if (!user?.uid || account.isDefault) return;
    const confirmed = window.confirm(`Delete “${account.name}”? Transactions linked to this account will not be deleted, but they will need to be reassigned.`);
    if (!confirmed) return;
    setError("");
    try {
      await deleteDoc(doc(db, "users", user.uid, "accounts", account.id));
      setMessage("Account deleted. Any linked transactions have been preserved and may need reassignment.");
    } catch (operationError) {
      setError(operationError?.message || "Unable to delete this account.");
    }
  };

  const assignLegacyTransactions = async () => {
    if (!user?.uid || !defaultAccount) return;
    const confirmed = window.confirm(`Assign every existing transaction without an account to “${defaultAccount.name}”? Existing transaction IDs and other fields will be preserved. No transaction will be deleted.`);
    if (!confirmed) return;
    setMigrating(true);
    setError("");
    setMessage("");
    try {
      const snapshot = await getDocs(transactionCollection(user.uid));
      const legacy = snapshot.docs.filter((item) => !item.data().accountId);
      let assigned = 0;
      for (let start = 0; start < legacy.length; start += 450) {
        const batch = writeBatch(db);
        legacy.slice(start, start + 450).forEach((item) => {
          batch.update(item.ref, { accountId: defaultAccount.id, updatedAt: serverTimestamp() });
          assigned += 1;
        });
        await batch.commit();
      }
      setMessage(assigned ? `Assigned ${assigned} existing transaction(s) to ${defaultAccount.name}.` : "All existing transactions already have an account assigned.");
    } catch (migrationError) {
      setError(`Migration could not finish: ${migrationError?.message || "Unknown error"}. No transactions were deleted; retry after checking your Firestore rules and connection.`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <main className="avenza-accounts-page">
      <header className="accounts-heading">
        <div className="accounts-title-wrap">
          <div className="accounts-title-icon"><Wallet size={24} /></div>
          <div><span className="accounts-eyebrow">FINANCIAL SETUP</span><h1>Accounts</h1><p>Keep each bank account, card, and cash wallet organized separately.</p></div>
        </div>
        <div className="accounts-heading-actions">
          {onBack && <button className="accounts-button secondary" onClick={onBack}><ArrowLeft size={17} /> Back to Overview</button>}
          <button className="accounts-button primary" onClick={() => { setForm(emptyForm); setEditingId(""); setShowForm(true); setError(""); setMessage(""); }}><Plus size={17} /> Add account</button>
        </div>
      </header>

      <section className="accounts-summary" aria-live="polite">
        <div><strong>{accounts.length}</strong><span>Accounts</span></div>
        <p>Account records are kept separate from the spreadsheet workspace. Your existing transactions remain in their current Firebase collection.</p>
      </section>

      {error && <div className="accounts-alert error" role="alert">{error}</div>}
      {message && <div className="accounts-alert success" role="status">{message}</div>}

      {showForm && <form className="accounts-form" onSubmit={saveAccount}>
        <div className="accounts-form-heading"><h2>{editingId ? "Edit account" : "Add an account"}</h2><button type="button" className="accounts-icon-button" aria-label="Close form" onClick={resetForm}><X size={18} /></button></div>
        <div className="accounts-form-grid">
          <label>Account name *<input autoFocus maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. HDFC Salary" required /></label>
          <label>Account type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{ACCOUNT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label>Bank / institution<input maxLength={100} value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} placeholder="e.g. HDFC Bank" /></label>
          <label>Last 4 digits (optional)<input inputMode="numeric" maxLength={4} value={form.last4} onChange={(event) => setForm({ ...form, last4: event.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" /></label>
          <label className="accounts-notes-field">Notes (optional)<textarea maxLength={300} rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="A reminder about this account" /></label>
        </div>
        <div className="accounts-form-actions"><button type="button" className="accounts-button secondary" onClick={resetForm}>Cancel</button><button className="accounts-button primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create account"}</button></div>
      </form>}

      <section className="accounts-list-section"><div className="accounts-section-heading"><div><h2>Your accounts</h2><p>Choose a default account for existing and newly imported records.</p></div></div>
        {loading ? <div className="accounts-empty">Loading accounts…</div> : accounts.length === 0 ? <div className="accounts-empty">Preparing your default account…</div> : <div className="accounts-grid">{accounts.map((account) => {
          const Icon = account.type === "credit-card" ? CreditCard : account.type === "cash" ? Wallet : Landmark;
          return <article className="account-card" key={account.id}>
            <div className="account-card-top"><div className="account-card-icon"><Icon size={21} /></div>{account.isDefault && <span className="account-default-badge"><Check size={13} /> Default</span>}</div>
            <h3>{account.name}</h3><p className="account-type-label">{ACCOUNT_TYPES.find((type) => type.value === account.type)?.label || "Other account"}</p>
            {account.institution && <p className="account-institution">{account.institution}{account.last4 ? ` · •••• ${account.last4}` : ""}</p>}
            {account.notes && <p className="account-notes">{account.notes}</p>}
            <div className="account-card-actions"><button className="accounts-button secondary" onClick={() => startEdit(account)}>Edit</button>{!account.isDefault && <button className="accounts-button secondary" onClick={() => makeDefault(account)}>Make default</button>}{!account.isDefault && <button className="accounts-icon-button danger" aria-label={`Delete ${account.name}`} title="Delete account" onClick={() => removeAccount(account)}><Trash2 size={16} /></button>}</div>
          </article>;
        })}</div>}
      </section>

      <section className="accounts-migration-card"><div><span className="accounts-eyebrow">EXISTING DATA</span><h2>Connect your current transactions</h2><p>When you're ready, assign transactions that don't yet have an account to your default account. This preserves transaction IDs and all existing fields. It doesn't delete or duplicate transactions.</p></div><button className="accounts-button secondary" disabled={migrating || loading || !defaultAccount} onClick={assignLegacyTransactions}>{migrating ? "Assigning transactions…" : "Assign existing transactions"}</button></section>
    </main>
  );
}
