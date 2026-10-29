import { ArrowDownLeft, ArrowUpRight, CalendarDays, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/dates";

export default function TransactionTable({
  transactions = [],
  loading = false,
  onEdit,
  onDelete,
  deletingId = "",
}) {
  if (loading) {
    return (
      <div className="avtx-table-state" role="status">
        <span className="avtx-spinner" />
        <strong>Loading your transactions…</strong>
        <p>Syncing your records with your account.</p>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="avtx-table-state">
        <div className="avtx-empty-icon"><CalendarDays size={24} /></div>
        <strong>No transactions found</strong>
        <p>Try changing your filters, or add a transaction to get started.</p>
      </div>
    );
  }

  return (
    <div className="avtx-table-scroll">
      <table className="avtx-table">
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">Category</th>
            <th scope="col">Date</th>
            <th scope="col" className="numeric">Amount</th>
            <th scope="col" className="actions-heading"><span className="sr-only">Actions</span><MoreHorizontal size={16} /></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "income";
            return (
              <tr key={transaction.id}>
                <td>
                  <div className="avtx-transaction-name">
                    <span className={`avtx-transaction-icon ${isIncome ? "income" : "expense"}`}>
                      {isIncome ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                    </span>
                    <span className="avtx-transaction-copy">
                      <strong>{transaction.name || "Untitled transaction"}</strong>
                      {transaction.notes && <small title={transaction.notes}>{transaction.notes}</small>}
                    </span>
                  </div>
                </td>
                <td><span className="avtx-category-pill">{transaction.category || "Other"}</span></td>
                <td className="avtx-date-cell">{formatDate(transaction.date)}</td>
                <td className={`numeric avtx-amount ${isIncome ? "positive" : "negative"}`}>
                  {isIncome ? "+" : "−"}{formatCurrency(transaction.amount)}
                </td>
                <td>
                  <div className="avtx-row-actions">
                    <button type="button" onClick={() => onEdit?.(transaction)} aria-label={`Edit ${transaction.name}`} title="Edit transaction">
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDelete?.(transaction)}
                      disabled={deletingId === transaction.id}
                      aria-label={`Delete ${transaction.name}`}
                      title="Delete transaction"
                    >
                      {deletingId === transaction.id ? <span className="avtx-mini-spinner" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
