import { useEffect, useState } from "react";
import { CalendarDays, CircleDollarSign, FileText, Tag, X } from "lucide-react";
import { toLocalDateString } from "../../utils/dates";

const DEFAULT_CATEGORIES = {
  expense: [
    "Food", "Shopping", "Transport", "Housing", "Bills", "Health",
    "Entertainment", "Subscriptions", "Education", "Travel", "Other",
  ],
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"],
};

const EMPTY_FORM = {
  name: "",
  amount: "",
  type: "expense",
  category: "Food",
  date: toLocalDateString(),
  notes: "",
};

export default function TransactionForm({
  initialTransaction = null,
  onSubmit,
  onCancel,
  submitting = false,
  error = "",
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!initialTransaction) {
      setForm({ ...EMPTY_FORM, date: toLocalDateString() });
      setFieldErrors({});
      return;
    }

    setForm({
      name: initialTransaction.name || "",
      amount: String(initialTransaction.amount ?? ""),
      type: initialTransaction.type === "income" ? "income" : "expense",
      category: initialTransaction.category || "Other",
      date: initialTransaction.date || toLocalDateString(),
      notes: initialTransaction.notes || "",
    });
    setFieldErrors({});
  }, [initialTransaction]);

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "type") {
        const categories = DEFAULT_CATEGORIES[value];
        if (!categories.includes(current.category)) next.category = categories[0];
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const amount = Number(form.amount);

    if (!form.name.trim()) nextErrors.name = "Enter a transaction name.";
    if (form.amount === "" || !Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Enter an amount greater than zero.";
    }
    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      nextErrors.date = "Choose a valid date.";
    }
    if (!form.category.trim()) nextErrors.category = "Choose a category.";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit({
      name: form.name.trim(),
      amount,
      type: form.type,
      category: form.category.trim(),
      date: form.date,
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    });
  };

  const categories = DEFAULT_CATEGORIES[form.type];

  return (
    <form className="avtx-form" onSubmit={handleSubmit} noValidate>
      <div className="avtx-form-heading">
        <div>
          <span className="avtx-eyebrow">{initialTransaction ? "UPDATE RECORD" : "NEW RECORD"}</span>
          <h2>{initialTransaction ? "Edit transaction" : "Add transaction"}</h2>
          <p>Keep your financial activity accurate and up to date.</p>
        </div>
        {onCancel && (
          <button type="button" className="avtx-icon-button" onClick={onCancel} aria-label="Close form">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="avtx-type-switch" role="group" aria-label="Transaction type">
        <button
          type="button"
          className={form.type === "expense" ? "active expense" : ""}
          onClick={() => updateField("type", "expense")}
          aria-pressed={form.type === "expense"}
        >
          Expense
        </button>
        <button
          type="button"
          className={form.type === "income" ? "active income" : ""}
          onClick={() => updateField("type", "income")}
          aria-pressed={form.type === "income"}
        >
          Income
        </button>
      </div>

      <label className="avtx-field">
        <span>Transaction name</span>
        <span className="avtx-input-wrap">
          <FileText size={17} aria-hidden="true" />
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Groceries, Salary, Netflix"
            maxLength={100}
            autoFocus
          />
        </span>
        {fieldErrors.name && <small className="avtx-field-error">{fieldErrors.name}</small>}
      </label>

      <label className="avtx-field">
        <span>Amount (₹)</span>
        <span className="avtx-input-wrap">
          <CircleDollarSign size={17} aria-hidden="true" />
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            placeholder="0.00"
          />
        </span>
        {fieldErrors.amount && <small className="avtx-field-error">{fieldErrors.amount}</small>}
      </label>

      <div className="avtx-form-grid">
        <label className="avtx-field">
          <span>Category</span>
          <span className="avtx-input-wrap">
            <Tag size={17} aria-hidden="true" />
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {!categories.includes(form.category) && <option value={form.category}>{form.category}</option>}
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </span>
          {fieldErrors.category && <small className="avtx-field-error">{fieldErrors.category}</small>}
        </label>

        <label className="avtx-field">
          <span>Date</span>
          <span className="avtx-input-wrap">
            <CalendarDays size={17} aria-hidden="true" />
            <input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
          </span>
          {fieldErrors.date && <small className="avtx-field-error">{fieldErrors.date}</small>}
        </label>
      </div>

      <label className="avtx-field">
        <span>Notes <em>Optional</em></span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Add a note to help you remember this transaction"
          rows={3}
          maxLength={500}
        />
      </label>

      {error && <div className="avtx-error-banner" role="alert">{error}</div>}

      <div className="avtx-form-actions">
        {onCancel && <button type="button" className="avtx-button secondary" onClick={onCancel} disabled={submitting}>Cancel</button>}
        <button type="submit" className="avtx-button primary" disabled={submitting}>
          {submitting ? "Saving…" : initialTransaction ? "Save changes" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
