export function toLocalDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDate(value, options = {}) {
  const date = typeof value === "string" ? parseDateOnly(value) : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(options.locale || "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getMonthRange(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("A valid date is required.");
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    start: toLocalDateString(new Date(year, month, 1)),
    end: toLocalDateString(new Date(year, month + 1, 0)),
  };
}

export function isDateWithinRange(date, start, end) {
  if (!date) return false;
  return (!start || date >= start) && (!end || date <= end);
}
