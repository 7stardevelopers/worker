import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Notifications, { NOTIFICATIONS_SUPPORTED } from '@utils/notifications';
import { router } from 'expo-router';
import { api, TOKEN_KEYS, setTokenRefreshCallback, setSessionExpiredCallback } from '@utils/api';
import { stopLocationTracking } from '@utils/location';

const PUSH_TOKEN_KEY = 'push_token';
const SESSION_KEYS = [TOKEN_KEYS.access, TOKEN_KEYS.refresh, TOKEN_KEYS.user];

// Remote push isn't available in Expo Go (SDK 53+) — skip instead of prompting.
const PUSH_SUPPORTED = NOTIFICATIONS_SUPPORTED;

const AuthContext = createContext({});

function parseUser(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

async function registerPushToken(accessToken) {
  if (!PUSH_SUPPORTED) return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/notifications/register', { token_id: data }, accessToken);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, data);
  } catch {
    // non-fatal — the worker still sees new jobs through polling, just no push
  }
}

// Best-effort server cleanup so a signed-out phone stops getting job pushes,
// stops showing as online, and its refresh token can't be reused.
async function signOutOnServer(accessToken, refreshToken, pushToken) {
  const calls = [];
  if (accessToken) calls.push(api.patch('/providers/me/availability', { is_available: false }, accessToken));
  if (accessToken && pushToken) calls.push(api.delete(`/notifications/token?token_id=${encodeURIComponent(pushToken)}`, accessToken));
  if (refreshToken) calls.push(api.post('/auth/logout', { refresh_token: refreshToken }));
  await Promise.allSettled(calls);
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  const expiredAlertShown = useRef(false);

  const clearLocal = useCallback(async () => {
    await stopLocationTracking().catch(() => {});
    await AsyncStorage.multiRemove([...SESSION_KEYS, PUSH_TOKEN_KEY]);
    userRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setTokenRefreshCallback(newToken => setToken(newToken));
    setSessionExpiredCallback(async () => {
      if (expiredAlertShown.current) return;
      // Only a live session can expire — not the background cleanup calls that
      // run after the worker already logged out.
      const stillSignedIn = await AsyncStorage.getItem(TOKEN_KEYS.access).catch(() => null);
      if (!stillSignedIn) return;
      expiredAlertShown.current = true;
      await clearLocal();
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{ text: 'Go to Login', onPress: () => { expiredAlertShown.current = false; router.replace('/(auth)/login'); } }],
        { cancelable: false },
      );
    });

    AsyncStorage.multiGet([TOKEN_KEYS.access, TOKEN_KEYS.user])
      .then(([[, storedToken], [, storedUser]]) => {
        const parsed = parseUser(storedUser);
        // A CUSTOMER session left over in this app can't use provider routes.
        if (storedToken && parsed?.role === 'PROVIDER') {
          userRef.current = parsed;
          setToken(storedToken);
          setUser(parsed);
        } else if (storedToken) {
          AsyncStorage.multiRemove(SESSION_KEYS);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clearLocal]);

  const login = useCallback(async (accessToken, refreshToken, u) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEYS.access,  accessToken],
      [TOKEN_KEYS.refresh, refreshToken],
      [TOKEN_KEYS.user,    JSON.stringify(u)],
    ]);
    userRef.current = u;
    setToken(accessToken);
    setUser(u);
    registerPushToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    const [[, accessToken], [, refreshToken], [, pushToken]] =
      await AsyncStorage.multiGet([TOKEN_KEYS.access, TOKEN_KEYS.refresh, PUSH_TOKEN_KEY]);
    // Sign out locally first so the button responds instantly even offline.
    await clearLocal();
    router.replace('/(auth)/login');
    signOutOnServer(accessToken, refreshToken, pushToken);
  }, [clearLocal]);

  const updateUser = useCallback(async (updates) => {
    const next = userRef.current ? { ...userRef.current, ...updates } : updates;
    userRef.current = next;
    setUser(next);
    await AsyncStorage.setItem(TOKEN_KEYS.user, JSON.stringify(next));
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, updateUser }),
    [user, token, loading, login, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
