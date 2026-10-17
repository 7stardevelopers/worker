// Money formatting lives in utils/money.js (formatINR takes rupees).

/** "9876543210" -> "+91 98765 43210". */
export function formatPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return `+91 ${digits}`.trim();
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
