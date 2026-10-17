// The API stores and returns every money value as integer PAISE (₹499 = 49900).
// Convert with fromPaise() at the boundary (utils/normalize.js or right after an
// api.* call), keep rupees everywhere in the UI, and send paise back with toPaise().

// Minimum payout, in rupees.
export const MIN_PAYOUT = 100;

/** Paise (API) → rupees (UI). Null/invalid → 0. */
export function fromPaise(paise) {
  const n = Number(paise);
  return Number.isFinite(n) ? n / 100 : 0;
}

/** Rupees (UI) → integer paise (API). Null/invalid → 0. */
export function toPaise(rupees) {
  const n = Number(rupees);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Format a RUPEE amount. Shows paise (2 decimals) only when the value isn't a
 * whole rupee, unless `decimals` is given explicitly.
 */
export function formatINR(amount, { decimals } = {}) {
  const n = Number(amount) || 0;
  const d = decimals ?? (Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}
