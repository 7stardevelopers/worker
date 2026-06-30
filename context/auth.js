import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY  = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY          = 'auth_user';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]).then(([storedToken, storedUser]) => {
      if (storedToken) {
        setToken(storedToken);
        setUser(storedUser ? JSON.parse(storedUser) : null);
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
  };

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
