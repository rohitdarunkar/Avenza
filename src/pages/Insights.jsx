
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Target,
} from "lucide-react";

import { auth } from "../firebase";
import useFinancialInsights from "../hooks/useFinancialInsights";

import FinancialOverview from "../components/insights/FinancialOverview";
import InsightsCards from "../components/insights/InsightsCards";
import MonthlyComparison from "../components/insights/MonthlyComparison";
import SpendingBreakdown from "../components/insights/SpendingBreakdown";
import SpendingTrendChart from "../components/insights/SpendingTrendChart";

import { formatCurrency } from "../utils/currency";
import "./insights.css";

function MonthPicker({
  month,
  offset,
  previous,
  next,
  current,
  canNext,
}) {
  return (
    <div className="avin-month-navigator">
      <button
        type="button"
        onClick={previous}
        aria-label="Previous month"
      >
        <ArrowLeft size={16} />
      </button>

      <div>
        <CalendarDays size={16} />
        <strong>
          {month.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </strong>
      </div>

      <button
        type="button"
        disabled={!canNext}
        onClick={next}
        aria-label="Next month"
      >
        <ArrowRight size={16} />
      </button>

      {offset !== 0 && (
        <button
          type="button"
          className="avin-current-month"
          onClick={current}
        >
          Current month
        </button>
      )}
    </div>
  );
}

function SavingsPlanner({ monthlyIncome = 0, monthlyExpenses = 0 }) {
  const [target, setTarget] = useState("50000");
  const [months, setMonths] = useState("6");
  const targetAmount = Math.max(0, Number(target) || 0);
  const duration = Math.max(1, Number(months) || 1);
  const monthlyRequired = targetAmount / duration;
  const available = Math.max(0, monthlyIncome - monthlyExpenses);
  const isAffordable = monthlyRequired <= available;

  return (
    <section className="avin-savings-planner" aria-labelledby="avin-savings-title">
      <div className="avin-savings-intro">
        <span className="avin-savings-icon"><Target size={19} /></span>
        <div>
          <span className="avin-eyebrow">YOUR NEXT MILESTONE</span>
          <h2 id="avin-savings-title">Build a savings plan</h2>
          <p>Estimate a monthly target using your recorded income and expenses.</p>
        </div>
      </div>

      <div className="avin-savings-fields">
        <label>
          Savings goal (₹)
          <input
            type="number"
            min="0"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          Reach it in
          <select value={months} onChange={(event) => setMonths(event.target.value)}>
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="9">9 months</option>
            <option value="12">12 months</option>
            <option value="18">18 months</option>
            <option value="24">24 months</option>
          </select>
        </label>
      </div>

      <div className="avin-savings-result">
        <div>
          <span>Required monthly saving</span>
          <strong>{formatCurrency(monthlyRequired)}</strong>
        </div>
        <div>
          <span>Current monthly balance</span>
          <strong>{formatCurrency(available)}</strong>
        </div>
        <p className={isAffordable ? "is-feasible" : "needs-adjustment"}>
          {targetAmount <= 0
            ? "Enter a goal amount greater than zero to calculate your plan."
            : isAffordable
              ? "This target fits within your current recorded monthly balance. Keep a buffer for unexpected expenses."
              : `This target is about ${formatCurrency(monthlyRequired - available)} above your current monthly balance. Consider extending the timeline or reducing the target.`}
        </p>
      </div>
      <small className="avin-savings-disclaimer">
        Estimate only, based on the selected month’s recorded transactions. It does not account for irregular expenses or existing savings.
      </small>
    </section>
  );
}

export default function Insights({ user: suppliedUser, onBack, selectedAccountId = "all" }) {
  const [user, setUser] = useState(
    suppliedUser || auth.currentUser || null
  );

  const [authReady, setAuthReady] = useState(
    Boolean(suppliedUser || auth.currentUser)
  );

  useEffect(() => {
    if (suppliedUser) {
      setUser(suppliedUser);
      setAuthReady(true);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, [suppliedUser]);

  const state = useFinancialInsights(user?.uid, selectedAccountId);

  if (!authReady) {
    return (
      <main className="avin-page">
        <div className="avin-state">Loading your account…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="avin-page">
        <section className="avin-access-card">
          <ShieldCheck size={27} />

          <h1>Sign in to explore Insights</h1>

          <p>
            Your insights are calculated from transactions saved
            to your private Avenza account.
          </p>

          {onBack && (
            <button
              type="button"
              className="avin-button secondary"
              onClick={onBack}
            >
              Back to dashboard
            </button>
          )}
        </section>
      </main>
    );
  }

  const analytics = state.analytics;

  return (
    <main className="avin-page">
      <div className="avin-page-inner">
        <header className="avin-header">
          <div>
            <span className="avin-eyebrow">
              YOUR MONEY, MADE CLEAR
            </span>

            <h1>Financial insights</h1>

            <p>
              Understand spending patterns and make more informed
              decisions.
            </p>
          </div>

          <MonthPicker
            month={state.selectedMonth}
            offset={state.monthOffset}
            previous={state.goToPreviousMonth}
            next={state.goToNextMonth}
            current={state.goToCurrentMonth}
            canNext={state.canGoToNextMonth}
          />
        </header>

        {state.error && (
          <div className="avin-alert error" role="alert">
            {state.error}
          </div>
        )}

        {state.loading && (
          <div className="avin-alert" role="status">
            Syncing your latest transactions…
          </div>
        )}

        <section className="avin-section-heading">
          <div>
            <h2>Monthly overview</h2>
            <p>
              Based on {analytics.transactionCount} transactions
              in the selected month.
            </p>
          </div>

          <span className="avin-period-pill">
            {state.selectedMonth.toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </section>

        <FinancialOverview
          summary={analytics.summary}
          comparison={analytics.comparison}
        />

        <section className="avin-main-grid">
          <SpendingTrendChart data={analytics.monthlyTrend} />

          <SpendingBreakdown
            categories={analytics.expensesByCategory}
          />
        </section>

        <MonthlyComparison comparison={analytics.comparison} />

        <InsightsCards observations={analytics.observations} />

        <SavingsPlanner
          monthlyIncome={analytics.summary.income}
          monthlyExpenses={analytics.summary.expenses}
        />

        <footer className="avin-footnote">
          <ShieldCheck size={15} />
          Private to your account. Insights update as saved
          transactions change.
        </footer>
      </div>
    </main>
  );
}

