
import { Lightbulb } from "lucide-react";

export default function InsightsCards({ observations = [] }) {
  return (
    <>
      <section className="avin-section-heading">
        <div>
          <h2>Observations for you</h2>
          <p>
            Patterns calculated from your recorded transactions, not guesses.
          </p>
        </div>
      </section>

      <section className="avin-observation-grid">
        {observations.length > 0 ? (
          observations.map((item) => (
            <article
              className={`avin-observation-card ${item.tone || "neutral"}`}
              key={item.id}
            >
              <span className="avin-observation-icon">
                <Lightbulb size={18} />
              </span>

              <div className="avin-observation-copy">
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                {typeof item.percentage === "number" && (
                  <div className="avin-observation-progress" aria-label={`${item.percentage.toFixed(1)} percent`}>
                    <span style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }} />
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <article className="avin-observation-card neutral">
            <span className="avin-observation-icon">
              <Lightbulb size={18} />
            </span>
            <div>
              <h3>No observations yet</h3>
              <p>Add transactions to generate financial observations.</p>
            </div>
          </article>
        )}
      </section>
    </>
  );
}

