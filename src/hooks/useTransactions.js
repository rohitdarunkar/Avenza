import { useCallback, useEffect, useState } from "react";
import {
  createTransaction,
  removeTransaction,
  subscribeToTransactions,
  updateTransaction,
} from "../services/transactionService";

/**
 * Shared signed-in transaction state.
 *
 * Usage:
 * const { transactions, loading, error, add, update, remove, refreshError } =
 *   useTransactions(user?.uid);
 *
 * Guest/demo transactions remain owned by the existing GuestDashboard for now.
 * This avoids changing current guest behaviour during Phase 1.
 */
export default function useTransactions(userId) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!userId) {
      setTransactions([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    setError("");

    const unsubscribe = subscribeToTransactions(
      userId,
      (nextTransactions) => {
        if (!active) return;
        setTransactions(nextTransactions);
        setLoading(false);
        setError("");
      },
      (subscriptionError) => {
        if (!active) return;
        console.error("Avenza transaction subscription error:", subscriptionError);
        setError(
          subscriptionError?.message ||
            "Unable to load transactions. Check your connection and try again."
        );
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId]);

  const add = useCallback(
    async (input) => {
      if (!userId) throw new Error("Sign in to save transactions to your account.");
      setError("");
      try {
        return await createTransaction(userId, input);
      } catch (operationError) {
        setError(operationError?.message || "Unable to save this transaction.");
        throw operationError;
      }
    },
    [userId]
  );

  const update = useCallback(
    async (transactionId, input) => {
      if (!userId) throw new Error("Sign in to edit saved transactions.");
      setError("");
      try {
        return await updateTransaction(userId, transactionId, input);
      } catch (operationError) {
        setError(operationError?.message || "Unable to update this transaction.");
        throw operationError;
      }
    },
    [userId]
  );

  const remove = useCallback(
    async (transactionId) => {
      if (!userId) throw new Error("Sign in to delete saved transactions.");
      setError("");
      try {
        await removeTransaction(userId, transactionId);
      } catch (operationError) {
        setError(operationError?.message || "Unable to delete this transaction.");
        throw operationError;
      }
    },
    [userId]
  );

  const clearError = useCallback(() => setError(""), []);

  return {
    transactions,
    loading,
    error,
    add,
    update,
    remove,
    clearError,
  };
}
