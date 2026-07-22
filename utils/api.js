import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

let onTokenRefreshed = null;
export function setTokenRefreshCallback(cb) { onTokenRefreshed = cb; }

async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem('auth_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Refresh failed');
  const newToken = data.data?.access_token;
  await AsyncStorage.setItem('auth_access_token', newToken);
  onTokenRefreshed?.(newToken);
  return newToken;
}

async function request(method, path, body, token, isRetry = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();

  if (res.status === 401 && !isRetry) {
    try {
      const newToken = await refreshAccessToken();
      return request(method, path, body, newToken, true);
    } catch {
      const err = new Error('Session expired. Please log in again.');
      err.status = 401;
      throw err;
    }
  }

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, token)       => request('DELETE', path, null, token),
};
