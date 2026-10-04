// Dev-only API call logging. Shows up in the Metro terminal and the React Native
// DevTools console (press "j"). Release builds log nothing.

const SECRET_KEY = /otp|token|password|secret|authorization|aadhaar|account_number|^pan$|^pan_number$/i;
const MAX_STRING = 300;

function maskPhone(v) {
  const s = String(v);
  return s.length < 6 ? s : `${s.slice(0, 3)}****${s.slice(-3)}`;
}

export function redact(value, key = '') {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(v => redact(v));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  if (SECRET_KEY.test(key) && (typeof value === 'string' || typeof value === 'number')) return '[REDACTED]';
  if (/phone/i.test(key) && (typeof value === 'string' || typeof value === 'number')) return maskPhone(value);
  if (typeof value === 'string' && value.length > MAX_STRING) {
    return `${value.slice(0, 60)}…(${value.length} chars)`;
  }
  return value;
}

/**
 * status 0 = the request never got a response (offline / timeout).
 * tag marks retries after a token refresh, mock responses, etc.
 */
export function logApi({ method, path, status, ms, body, data, error, tag }) {
  if (!__DEV__) return;
  const ok = status >= 200 && status < 400;
  const head = `${ok ? '✅' : '❌'} ${status || 'ERR'} ${method} ${path} (${ms}ms)${tag ? ` [${tag}]` : ''}`;
  const msg = error || (!ok ? data?.message || data?.error : null);
  const detail = {};
  if (body != null) detail.payload = redact(body);
  if (data !== undefined) detail.response = redact(data);
  console.log(msg ? `${head} — ${msg}` : head, detail);
}
