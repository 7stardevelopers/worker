import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { getColors } from '@constants/theme';

const ThemeContext = createContext({
  mode: 'light',
  isDark: false,
  toggleTheme: () => {},
  Colors: getColors(false),
});

const STORAGE_KEY = 'app_theme_mode';

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  // Start dark (the app's default) so launch doesn't flash light before storage loads.
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'dark' || saved === 'light') setMode(saved);
      else setMode('dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggleTheme, Colors: getColors(isDark) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).Colors;
