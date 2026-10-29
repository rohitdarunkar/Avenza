import { ArrowDownLeft, ArrowUpRight, Wallet, ReceiptText } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

function SummaryCard({ label, value, hint, tone, icon: Icon }) {
  return (
    <article className={`avtx-summary-card ${tone}`}>
      <div className="avtx-summary-icon"><Icon size={19} /></div>
      <div className="avtx-summary-label">{label}</div>
      <strong>{label === "Transactions" ? new Intl.NumberFormat("en-IN").format(value) : formatCurrency(value)}</strong>
      <small>{hint}</small>
    </article>
  );
}

export default function TransactionSummary({ summary }) {
  return (
    <section className="avtx-summary-grid" aria-label="Transaction summary">
      <SummaryCard
        label="Income"
        value={summary.income}
        hint="Across the selected transactions"
        tone="income"
        icon={ArrowDownLeft}
      />
      <SummaryCard
        label="Expenses"
        value={summary.expenses}
        hint="Across the selected transactions"
        tone="expense"
        icon={ArrowUpRight}
      />
      <SummaryCard
        label="Net balance"
        value={summary.balance}
        hint={summary.balance >= 0 ? "Income minus expenses" : "Expenses exceed income"}
        tone="balance"
        icon={Wallet}
      />
      <SummaryCard
        label="Transactions"
        value={summary.count}
        hint="Matching your current filters"
        tone="count"
        icon={ReceiptText}
        />
    </section>
  );
}
