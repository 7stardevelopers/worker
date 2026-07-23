import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api, setTokenRefreshCallback, setSessionExpiredCallback } from '@utils/api';

const ACCESS_TOKEN_KEY  = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY          = 'auth_user';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const alertShownRef = useRef(false);

  useEffect(() => {
    setTokenRefreshCallback((newToken) => setToken(newToken));
    setSessionExpiredCallback(async () => {
      if (alertShownRef.current) return;
      alertShownRef.current = true;
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{
          text: 'Go to Login',
          onPress: () => {
            alertShownRef.current = false;
            setToken(null);
            setUser(null);
            router.replace('/(auth)/login');
          },
        }],
        { cancelable: false },
      );
    });
    Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]).then(([storedToken, storedUser]) => {
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      // Auto-logout if stored user has wrong role (e.g. CUSTOMER in Worker app)
      if (storedToken && parsedUser?.role === 'PROVIDER') {
        setToken(storedToken);
        setUser(parsedUser);
      } else if (storedToken) {
        AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
      }
    }).finally(() => setLoading(false));
  }, []);

  const login = async (accessToken, refreshToken, u) => {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY,  accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
      [USER_KEY,          JSON.stringify(u)],
    ]);
    setToken(accessToken);
    setUser(u);
    registerPushToken(accessToken);
  };

  async function registerPushToken(accessToken) {
    // expo-notifications push tokens don't work in Expo Go (SDK 53+)
    if (Constants.appOwnership === 'expo') return;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      await api.post('/notifications/register', { token_id: tokenData.data }, accessToken);
    } catch {
      // non-fatal — worker will still function, just won't receive push
    }
  }

  const logout = async () => {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates) => {
    setUser(prev => {
      const next = prev ? { ...prev, ...updates } : updates;
      AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
