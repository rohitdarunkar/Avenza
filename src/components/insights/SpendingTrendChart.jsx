
import { formatCurrency } from "../../utils/currency";

export default function SpendingTrendChart({ data = [] }) {
  const max = Math.max(1, ...data.flatMap((item) => [item.income, item.expenses]));

  const width = 620;
  const height = 190;
  const left = 16;
  const right = 14;
  const top = 14;
  const bottom = 28;

  const x = (index) =>
    left +
    (data.length < 2
      ? (width - left - right) / 2
      : (index * (width - left - right)) / (data.length - 1));

  const y = (value) =>
    top + (height - top - bottom) * (1 - value / max);

  const hasData = data.some((item) => item.income || item.expenses);

  return (
    <article className="avin-panel">
      <div className="avin-panel-heading">
        <div>
          <h2>Income vs expenses</h2>
          <p>Last six months of recorded transactions</p>
        </div>
      </div>

      <div className="avin-chart-legend">
        <span>
          <i className="income" />
          Income
        </span>
        <span>
          <i className="expenses" />
          Expenses
        </span>
      </div>

      {!hasData ? (
        <div className="avin-chart-empty">
          Add transactions across months to see your trend.
        </div>
      ) : (
        <div className="avin-chart-scroll">
          <svg
            className="avin-trend-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Income and expenses for the last six months"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <line
                key={fraction}
                x1={left}
                x2={width - right}
                y1={top + (height - top - bottom) * fraction}
                y2={top + (height - top - bottom) * fraction}
                className="avin-grid-line"
              />
            ))}

            <polyline
              points={data
                .map((item, index) => `${x(index)},${y(item.income)}`)
                .join(" ")}
              className="avin-line-income"
            />

            <polyline
              points={data
                .map((item, index) => `${x(index)},${y(item.expenses)}`)
                .join(" ")}
              className="avin-line-expenses"
            />

            {data.map((item, index) => (
              <g key={item.key}>
                <circle
                  cx={x(index)}
                  cy={y(item.income)}
                  r="3.5"
                  className="avin-dot-income"
                >
                  <title>
                    {`${item.fullLabel} income: ${formatCurrency(item.income)}`}
                  </title>
                </circle>

                <circle
                  cx={x(index)}
                  cy={y(item.expenses)}
                  r="3.5"
                  className="avin-dot-expenses"
                >
                  <title>
                    {`${item.fullLabel} expenses: ${formatCurrency(item.expenses)}`}
                  </title>
                </circle>

                <text
                  x={x(index)}
                  y={height - 8}
                  textAnchor="middle"
                  className="avin-axis-label"
                >
                  {item.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </article>
  );
}

