
import { TrendingDown, TrendingUp } from "lucide-react";
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

export default function MonthlyComparison({ comparison }) {
  return (
    <section className="avin-panel avin-comparison-panel">
      <div className="avin-panel-heading">
        <div>
          <h2>Month-over-month comparison</h2>
          <p>Compare the selected month with the month before it.</p>
        </div>
      </div>

      <div className="avin-comparison-grid">
        <div>
          <span>Selected month income</span>
          <strong>{formatCurrency(comparison.current.income)}</strong>
          <Change value={comparison.incomeChange} />
        </div>

        <div>
          <span>Selected month expenses</span>
          <strong>{formatCurrency(comparison.current.expenses)}</strong>
          <Change value={comparison.expenseChange} inverse />
        </div>

        <div>
          <span>Previous month income</span>
          <strong>{formatCurrency(comparison.previous.income)}</strong>
        </div>

        <div>
          <span>Previous month expenses</span>
          <strong>{formatCurrency(comparison.previous.expenses)}</strong>
        </div>
      </div>
    </section>
  );
}

