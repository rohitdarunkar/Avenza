
import { useState } from "react";
import { formatCurrency } from "../../utils/currency";

const COLORS = [
  "#4d8dff",
  "#39c6a0",
  "#ffad5c",
  "#ad91ff",
  "#f07188",
  "#4cc4dc",
  "#b6c96a",
  "#d18b64",
];

export default function SpendingBreakdown({ categories = [] }) {
  const [selected, setSelected] = useState("");

  const total = categories.reduce((sum, item) => sum + item.amount, 0);

  const parts = categories.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    share: total > 0 ? item.amount / total : 0,
  }));

  const circumference = 2 * Math.PI * 52;
  let cursor = 0;

  const chosen = categories.find((item) => item.category === selected);

  return (
    <article className="avin-panel">
      <div className="avin-panel-heading">
        <div>
          <h2>Where your money goes</h2>
          <p>Expenses by category for the selected month</p>
        </div>
      </div>

      <div className="avin-category-layout">
        <div className="avin-donut-wrap">
          {total > 0 ? (
            <svg
              viewBox="0 0 140 140"
              className="avin-donut"
              role="img"
              aria-label="Expenses by category"
            >
              <circle
                cx="70"
                cy="70"
                r="52"
                className="avin-donut-track"
              />

              {parts.map((part) => {
                const start = cursor;
                cursor += part.share;

                return (
                  <circle
                    key={part.category}
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke={part.color}
                    strokeWidth="17"
                    strokeDasharray={`${part.share * circumference} ${circumference}`}
                    strokeDashoffset={-start * circumference}
                    transform="rotate(-90 70 70)"
                  >
                    <title>
                      {`${part.category}: ${part.percentage.toFixed(1)}%`}
                    </title>
                  </circle>
                );
              })}

              <text
                x="70"
                y="67"
                textAnchor="middle"
                className="avin-donut-total"
              >
                Total
              </text>

              <text
                x="70"
                y="83"
                textAnchor="middle"
                className="avin-donut-count"
              >
                {formatCurrency(total)}
              </text>
            </svg>
          ) : (
            <div className="avin-chart-empty">
              No expenses recorded this month.
            </div>
          )}
        </div>

        <div className="avin-category-list">
          {parts.length > 0 ? (
            parts.map((part) => (
              <button
                key={part.category}
                type="button"
                className={`avin-category-row ${
                  selected === part.category ? "selected" : ""
                }`}
                onClick={() =>
                  setSelected((current) =>
                    current === part.category ? "" : part.category
                  )
                }
              >
                <span
                  className="avin-category-dot"
                  style={{ "--category-color": part.color }}
                />

                <span className="avin-category-name">{part.category}</span>
                <span className="avin-category-percent">
                  {part.percentage.toFixed(1)}%
                </span>
                <strong>{formatCurrency(part.amount)}</strong>
              </button>
            ))
          ) : (
            <p className="avin-muted">
              Category breakdown appears after you record expenses.
            </p>
          )}
        </div>

        {chosen && (
          <div className="avin-category-selected">
            <strong>{chosen.category}</strong>
            <span>
              {formatCurrency(chosen.amount)} ·{" "}
              {chosen.percentage.toFixed(1)}% of expenses
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

