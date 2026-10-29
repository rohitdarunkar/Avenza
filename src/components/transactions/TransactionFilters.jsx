import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

export default function TransactionFilters({
  filters,
  onChange,
  categories = [],
  sortBy,
  onSortChange,
  resultCount = 0,
  totalCount = 0,
}) {
  const set = (field, value) => onChange({ ...filters, [field]: value });
  const reset = () => {
    onChange({
      search: "",
      type: "all",
      category: "all",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    });
    onSortChange("date-desc");
  };

  return (
    <section className="avtx-filter-panel" aria-label="Transaction filters">
      <div className="avtx-filter-topline">
        <div className="avtx-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => set("search", event.target.value)}
            placeholder="Search name, category, or notes…"
            aria-label="Search transactions"
          />
        </div>
        <label className="avtx-sort">
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
            <option value="name-asc">Name A–Z</option>
          </select>
        </label>
        <button type="button" className="avtx-button subtle" onClick={reset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      <div className="avtx-filter-grid">
        <label className="avtx-filter-field">
          <span><SlidersHorizontal size={13} /> Type</span>
          <select value={filters.type} onChange={(event) => set("type", event.target.value)}>
            <option value="all">All transactions</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label className="avtx-filter-field">
          <span>Category</span>
          <select value={filters.category} onChange={(event) => set("category", event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="avtx-filter-field">
          <span>From date</span>
          <input type="date" value={filters.startDate} onChange={(event) => set("startDate", event.target.value)} />
        </label>
        <label className="avtx-filter-field">
          <span>To date</span>
          <input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(event) => set("endDate", event.target.value)} />
        </label>
        <label className="avtx-filter-field">
          <span>Minimum ₹</span>
          <input type="number" min="0" value={filters.minAmount} onChange={(event) => set("minAmount", event.target.value)} placeholder="Any" />
        </label>
        <label className="avtx-filter-field">
          <span>Maximum ₹</span>
          <input type="number" min="0" value={filters.maxAmount} onChange={(event) => set("maxAmount", event.target.value)} placeholder="Any" />
        </label>
      </div>

      <div className="avtx-filter-footer">
        Showing <strong>{resultCount}</strong> of {totalCount} transactions
      </div>
    </section>
  );
}
