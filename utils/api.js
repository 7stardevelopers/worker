import AsyncStorage from '@react-native-async-storage/async-storage';
import { logApi } from '@utils/apiLog';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 20000;

export const TOKEN_KEYS = {
  access:  'auth_access_token',
  refresh: 'auth_refresh_token',
  user:    'auth_user',
};

let onTokenRefreshed = null;
/** Latest stored access token (may be newer than a token captured in a closure). */
export async function getAccessToken() {
  try { return await AsyncStorage.getItem(TOKEN_KEYS.access); } catch { return null; }
}

export function setTokenRefreshCallback(cb) { onTokenRefreshed = cb; }

let onSessionExpired = null;
export function setSessionExpiredCallback(cb) { onSessionExpired = cb; }

// Many parallel requests can hit 401 at once — report the expiry once per session.
let sessionExpiredNotified = false;
function notifySessionExpired() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  onSessionExpired?.();
}

// fetch with a hard timeout so a hung connection never leaves a spinner running
// forever, and a friendlier message when the device is offline.
async function fetchWithTimeout(url, options) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw new Error('Unable to reach the server. Check your internet connection.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Non-JSON bodies (API Gateway "Request Entity Too Large", empty 204s) must not crash the caller.
async function readJson(res) {
  try { return await res.json(); } catch { return null; }
}

function apiError(message, status) {
  const e = new Error(message || 'Something went wrong');
  e.status = status;
  return e;
}

// The backend rotates refresh tokens and revokes the old one on every refresh,
// so (a) the new refresh token MUST be stored, and (b) only one refresh may be
// in flight — a second concurrent refresh would present a revoked token and
// log the worker out.
let refreshPromise = null;

/** Exchanges the stored refresh token for a new pair. Resolves the new access token, or null. */
export function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(TOKEN_KEYS.refresh);
      if (!refreshToken) return null;
      const started = Date.now();
      const res = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await readJson(res);
      // Status only — the body is nothing but tokens.
      logApi({ method: 'POST', path: '/auth/refresh', status: res.status, ms: Date.now() - started, tag: 'silent refresh' });
      if (!res.ok) return null;
      const access = data?.data?.access_token;
      const refresh = data?.data?.refresh_token;
      if (!access) return null;
      const pairs = [[TOKEN_KEYS.access, access]];
      if (refresh) pairs.push([TOKEN_KEYS.refresh, refresh]);
      await AsyncStorage.multiSet(pairs);
      onTokenRefreshed?.(access);
      return access;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function send(method, path, body, accessToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return fetchWithTimeout(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// send + parse + dev log, so every attempt (including the post-refresh retry) is logged.
async function call(method, path, body, accessToken, tag) {
  const started = Date.now();
  let res;
  try {
    res = await send(method, path, body, accessToken);
  } catch (e) {
    logApi({ method, path, status: 0, ms: Date.now() - started, body, error: e.message, tag });
    throw e;
  }
  const data = await readJson(res);
  logApi({ method, path, status: res.status, ms: Date.now() - started, body, data, tag });
  return { res, data };
}

function errorMessage(res, data) {
  if (res.status === 413) return 'File is too large to upload. Please try a smaller photo.';
  return data?.message || data?.error;
}

async function request(method, path, body, token) {
  // Always prefer the stored token — the React state copy passed in may be stale
  // right after a silent refresh.
  let stored = null;
  try { stored = await AsyncStorage.getItem(TOKEN_KEYS.access); } catch {}
  const accessToken = stored || token;
  if (accessToken) sessionExpiredNotified = false;

  const { res, data } = await call(method, path, body, accessToken);

  // Only an authenticated 401 means the session expired — an unauthenticated one
  // (e.g. wrong OTP) is just an error for the screen.
  if (accessToken && (res.status === 401 || data?.message === 'Token expired')) {
    let latest = null;
    try { latest = await AsyncStorage.getItem(TOKEN_KEYS.access); } catch {}
    // Another request may already have refreshed while this one was in flight.
    const newToken = latest && latest !== accessToken ? latest : await refreshSession();
    if (!newToken) {
      notifySessionExpired();
      throw apiError('SESSION_EXPIRED', 401);
    }
    const { res: res2, data: data2 } = await call(method, path, body, newToken, 'retry');
    if (res2.status === 401) { notifySessionExpired(); throw apiError('SESSION_EXPIRED', 401); }
    if (!res2.ok) throw apiError(errorMessage(res2, data2), res2.status);
    return data2;
  }

  if (!res.ok) throw apiError(errorMessage(res, data), res.status);
  return data;
}

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, token)       => request('DELETE', path, null, token),
};
