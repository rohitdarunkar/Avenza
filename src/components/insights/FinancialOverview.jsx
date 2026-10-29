
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Wallet,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";

function Change({ value, inverse = false }) {
  if (value == null) {
    return <span className="avin-change neutral">No previous data</span>;
  }

  const up = value > 0;
  const good = inverse ? !up : up;
  const Icon = up ? TrendingUp : value < 0 ? TrendingDown : null;

  return (
    <span
      className={`avin-change ${
        value === 0 ? "neutral" : good ? "positive" : "negative"
      }`}
    >
      {Icon && <Icon size={13} />}
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function Metric({ title, value, detail, icon: Icon, tone }) {
  return (
    <article className={`avin-metric-card ${tone}`}>
      <div className="avin-metric-top">
        <span>{title}</span>
        <span className="avin-metric-icon">
          <Icon size={18} />
        </span>
      </div>

      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function FinancialOverview({ summary, comparison }) {
  const savingsRate =
    summary.savingsRate == null
      ? "—"
      : `${summary.savingsRate.toFixed(1)}%`;

  return (
    <section className="avin-metric-grid">
      <Metric
        title="Income"
        value={formatCurrency(summary.income)}
        detail={
          <>
            <Change value={comparison.incomeChange} /> vs previous month
          </>
        }
        icon={ArrowDownRight}
        tone="income"
      />

      <Metric
        title="Expenses"
        value={formatCurrency(summary.expenses)}
        detail={
          <>
            <Change value={comparison.expenseChange} inverse /> vs previous
            month
          </>
        }
        icon={ArrowUpRight}
        tone="expense"
      />

      <Metric
        title="Net balance"
        value={formatCurrency(summary.balance)}
        detail={
          summary.balance >= 0
            ? "Income minus expenses"
            : "Expenses exceed income"
        }
        icon={Wallet}
        tone="balance"
      />

      <Metric
        title="Savings rate"
        value={savingsRate}
        detail={
          savingsRate === "—"
            ? "Add income to calculate"
            : "Net balance as a share of income"
        }
        icon={ChartNoAxesCombined}
        tone="savings"
      />
    </section>
  );
}

