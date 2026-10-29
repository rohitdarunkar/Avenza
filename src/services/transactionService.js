import {
  addDoc,
  collection,
  getDocs,
  limit,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Canonical signed-in transaction collection:
 * users/{userId}/transactions
 *
 * Preserve the existing dashboard's core fields:
 * name, amount, type, category, date, createdAt.
 * Optional notes are preserved when present.
 */

const TRANSACTION_TYPES = new Set(["income", "expense"]);

export function normalizeDate(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
    return "";
  }

  if (typeof value?.toDate === "function") return normalizeDate(value.toDate());

  if (value instanceof Date || typeof value === "number") {
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
  }

  return "";
}

export function normalizeTransaction(record, id = record?.id) {
  const source = record && typeof record === "object" ? record : {};
  const rawType = String(source.type || source.transactionType || "expense")
    .trim()
    .toLowerCase();
  const type = ["income", "credit", "deposit"].includes(rawType) ? "income" : "expense";
  const rawAmount = Number(source.amount ?? source.value ?? source.total);

  return {
    ...source,
    id,
    name: String(source.name || source.description || source.title || (type === "income" ? "Income" : "Expense")).trim(),
    amount: Number.isFinite(rawAmount) ? rawAmount : 0,
    type,
    category: String(source.category || (type === "income" ? "Income" : "Other")).trim(),
    date: normalizeDate(source.date || source.transactionDate || source.createdAt),
    notes: String(source.notes || ""),
  };
}

export function validateTransaction(input) {
  const transaction = normalizeTransaction(input);
  const errors = {};

  if (!transaction.name) errors.name = "Enter a transaction name.";
  if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }
  if (!TRANSACTION_TYPES.has(transaction.type)) errors.type = "Choose income or expense.";
  if (!transaction.category) errors.category = "Choose a category.";
  if (!transaction.date) errors.date = "Choose a valid date.";

  return { valid: Object.keys(errors).length === 0, errors, transaction };
}

function getUserTransactionsCollection(userId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("A signed-in user is required to access saved transactions.");
  }
  return collection(db, "users", userId, "transactions");
}

/**
 * Return the user's default account ID, creating a safe fallback account when
 * this is the first account-aware transaction. Existing transaction documents
 * are not moved or rewritten by this helper.
 */
export async function getOrCreateDefaultAccountId(userId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("A signed-in user is required to access accounts.");
  }

  const accounts = collection(db, "users", userId, "accounts");
  const defaults = await getDocs(query(accounts, where("isDefault", "==", true), limit(1)));
  if (!defaults.empty) return defaults.docs[0].id;

  const existing = await getDocs(query(accounts, limit(1)));
  if (!existing.empty) {
    const firstAccount = existing.docs[0];
    await updateDoc(doc(db, "users", userId, "accounts", firstAccount.id), {
      isDefault: true,
      updatedAt: serverTimestamp(),
    });
    return firstAccount.id;
  }

  const created = await addDoc(accounts, {
    name: "Default Account",
    type: "other",
    institution: "",
    last4: "",
    notes: "Automatically created to organize existing Avenza transactions.",
    isDefault: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

function getUserTransactionDocument(userId, transactionId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("A signed-in user is required to change saved transactions.");
  }
  if (!transactionId || typeof transactionId !== "string") {
    throw new Error("A valid transaction ID is required.");
  }
  return doc(db, "users", userId, "transactions", transactionId);
}

export function subscribeToTransactions(userId, onData, onError) {
  const transactionsQuery = query(
    getUserTransactionsCollection(userId),
    orderBy("date", "desc")
  );

  return onSnapshot(
    transactionsQuery,
    (snapshot) => {
      const transactions = snapshot.docs
        .map((item) => normalizeTransaction(item.data(), item.id))
        .filter((item) => item.isSample !== true)
        .filter((item) => item.date && Number.isFinite(item.amount) && item.amount >= 0);
      onData(transactions);
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    }
  );
}

export async function createTransaction(userId, input) {
  const result = validateTransaction(input);
  if (!result.valid) {
    const error = new Error("Please correct the transaction details.");
    error.code = "invalid-transaction";
    error.validationErrors = result.errors;
    throw error;
  }

  const { name, amount, type, category, date, notes } = result.transaction;
  const accountId = String(input?.accountId || await getOrCreateDefaultAccountId(userId));
  const data = {
    name, amount, type, category, date, accountId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (notes) data.notes = notes;

  const docRef = await addDoc(getUserTransactionsCollection(userId), data);
  return { id: docRef.id, ...data, name, amount, type, category, date, notes: notes || "" };
}

export async function updateTransaction(userId, transactionId, input) {
  const result = validateTransaction(input);
  if (!result.valid) {
    const error = new Error("Please correct the transaction details.");
    error.code = "invalid-transaction";
    error.validationErrors = result.errors;
    throw error;
  }

  const { name, amount, type, category, date, notes } = result.transaction;
  const data = {
    name, amount, type, category, date,
    updatedAt: serverTimestamp(),
  };
  // Preserve the current account unless the caller explicitly changes it.
  if (input?.accountId) data.accountId = String(input.accountId);
  // Empty notes are intentionally written as an empty string to clear old notes.
  data.notes = notes || "";

  await updateDoc(getUserTransactionDocument(userId, transactionId), data);
  return { id: transactionId, name, amount, type, category, date, ...(data.accountId ? { accountId: data.accountId } : {}), notes: data.notes };
}

export async function removeTransaction(userId, transactionId) {
  await deleteDoc(getUserTransactionDocument(userId, transactionId));
}
