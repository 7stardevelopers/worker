// All API amounts are in paise (100 paise = 1 rupee).
export function formatINR(paise, { decimals = false } = {}) {
  const rupees = (Number(paise) || 0) / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

export function formatPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return `+91 ${digits}`.trim();
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
