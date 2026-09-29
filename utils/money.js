// Booking, earning and wallet amounts from the API are whole rupees (same
// convention the Customer app and admin panel use).
export const MIN_PAYOUT = 100;

export function formatINR(amount, { decimals = 0 } = {}) {
  const n = Number(amount) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
