import { useMemo, useState } from "react";
import useTransactions from "./useTransactions";
import { getInsightsAnalytics, shiftMonth } from "../services/insightsService";

export default function useFinancialInsights(userId, selectedAccountId = "all") {
  const transactionState = useTransactions(userId);
  const [monthOffset, setMonthOffset] = useState(0);
  const accountTransactions = useMemo(() => selectedAccountId === "all" ? transactionState.transactions : transactionState.transactions.filter((transaction) => transaction.accountId === selectedAccountId), [transactionState.transactions, selectedAccountId]);
  const selectedMonth = useMemo(() => shiftMonth(new Date(), monthOffset), [monthOffset]);
  const analytics = useMemo(
    () => getInsightsAnalytics(accountTransactions, selectedMonth),
    [accountTransactions, selectedMonth]
  );
  return {
    ...transactionState, transactions: accountTransactions, analytics, monthOffset, selectedMonth,
    goToPreviousMonth: () => setMonthOffset(v => v - 1),
    goToNextMonth: () => setMonthOffset(v => Math.min(0, v + 1)),
    goToCurrentMonth: () => setMonthOffset(0),
    canGoToNextMonth: monthOffset < 0,
  };
}
