import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { api } from '@utils/api';
import { useAuth } from '@context/auth';

const ProviderContext = createContext({});

async function hasFullLocationPermission() {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

export function ProviderProvider({ children }) {
  const { token } = useAuth();
  const [profile,       setProfile]       = useState(null);
  const [isAvailable,   setIsAvailable]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [locationOk,    setLocationOk]    = useState(false);
  const isAvailableRef = useRef(isAvailable);
  useEffect(() => { isAvailableRef.current = isAvailable; }, [isAvailable]);

  const refreshLocationPermission = useCallback(async () => {
    const ok = await hasFullLocationPermission();
    setLocationOk(ok);
    return ok;
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/providers/me', token);
      const p   = res.data;
      setProfile(p);
      setIsAvailable(!!p.is_available);
    } catch (e) {
      if (e.status === 404) {
        setProfile(null); // new user — no provider record yet
      } else {
        console.warn('[Provider] fetchProfile failed:', e.message);
      }
    } finally {
      setLoading(false);
      setProfileLoaded(true);
    }
  }, [token]);

  // Auto-fetch whenever the token changes (login / logout)
  useEffect(() => {
    if (token) {
      fetchProfile();
      refreshLocationPermission();
    } else {
      setProfile(null);
      setIsAvailable(false);
      setProfileLoaded(false);
    }
  }, [token]);

  // Re-check permission whenever the app returns to the foreground. If a
  // worker revokes location while online, force them offline right away
  // instead of relying on them to remember to toggle it off themselves.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !token) return;
      const ok = await refreshLocationPermission();
      if (!ok && isAvailableRef.current) {
        setIsAvailable(false);
        try {
          await api.patch('/providers/me/location-revoked', {}, token);
        } catch (e) {
          console.warn('[Provider] location-revoked report failed:', e.message);
        }
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'You are now offline',
              body: 'Location access was turned off, so we stopped sharing your position with customers.',
            },
            trigger: null,
          });
        } catch (e) {
          console.warn('[Provider] local notification failed:', e.message);
        }
      }
    });
    return () => sub.remove();
  }, [token, refreshLocationPermission]);

  const toggleAvailability = useCallback(async () => {
    const next = !isAvailable;
    if (next) {
      const ok = await refreshLocationPermission();
      if (!ok) {
        Alert.alert(
          'Location Required',
          'Turn on location access — including "Allow all the time" in Settings — before going online. Customers need to be able to see you on the way.'
        );
        return;
      }
    }
    setIsAvailable(next);
    try {
      await api.patch('/providers/me/availability', { is_available: next }, token);
    } catch (e) {
      setIsAvailable(!next);
    }
  }, [isAvailable, token, refreshLocationPermission]);

  return (
    <ProviderContext.Provider value={{
      profile, isAvailable, loading, profileLoaded, locationOk,
      refreshLocationPermission, fetchProfile, toggleAvailability, setProfile,
    }}>
      {children}
    </ProviderContext.Provider>
  );
}

export const useProvider = () => useContext(ProviderContext);
