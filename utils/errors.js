import { Alert } from 'react-native';

/**
 * One place to turn API errors into what the user sees.
 *
 * utils/api.js throws Error(message) with `.status` (HTTP code, when known).
 * The backend returns curated ValueError text ("Coupon has expired") that is fine
 * to show, but pydantic validation dumps and internal errors are not.
 */

export const isSessionExpired = e => e?.message === 'SESSION_EXPIRED';

export const isNotFound = e => e?.status === 404 || /not found/i.test(String(e?.message ?? ''));

const TECHNICAL = [
  /validation error for/i,     // pydantic
  /\[type=[a-z_]+/i,           // pydantic error codes
  /Input should be/i,          // pydantic v2 wording
  /Field required/i,
  /Internal server error/i,
  /Route not found/i,
  /Network request failed/i,
  /Unexpected token|JSON Parse/i,
  /^Something went wrong$/i,
];

/** A message safe to show, or null when nothing should be shown (session expired). */
export function friendlyError(e, fallback = 'Something went wrong. Please try again.') {
  const msg = String(e?.message ?? '').trim();
  if (isSessionExpired(e)) return null; // the app is already sending the user to login
  if (!msg || TECHNICAL.some(re => re.test(msg))) return fallback;
  return msg;
}

/** Alert with a friendly message; no-op when the session expired. */
export function alertError(title, e, fallback) {
  const msg = friendlyError(e, fallback);
  if (msg) Alert.alert(title, msg);
}
