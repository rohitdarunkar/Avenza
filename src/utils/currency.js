const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function toFiniteNumber(value, fallback = 0) {
  if (typeof value === "string" && value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatCurrency(value, options = {}) {
  const amount = toFiniteNumber(value);
  const formatter = new Intl.NumberFormat(options.locale || "en-IN", {
    style: "currency",
    currency: options.currency || "INR",
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  });
  return formatter.format(amount);
}

export function formatCompactCurrency(value, locale = "en-IN") {
  const amount = toFiniteNumber(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export { inrFormatter };
export default formatCurrency;
