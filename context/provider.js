import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import Notifications from '@utils/notifications';
import { api } from '@utils/api';
import { reconcileTracking, hasTrackingPermission } from '@utils/location';
import { useAuth } from '@context/auth';

const ProviderContext = createContext({});

// Foreground-only in Expo Go (see IS_EXPO_GO in utils/location.js)
const hasFullLocationPermission = hasTrackingPermission;

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

  // GET /providers/me never 404s — the backend creates a PENDING record on the
  // first call, so a brand-new worker comes back as status PENDING.
  // Resolves the fresh profile (or null on failure) so callers can route on it.
  const fetchProfile = useCallback(async () => {
    if (!token) return null;
    setLoading(true);
    try {
      const res = await api.get('/providers/me', token);
      const p   = res.data;
      setProfile(p);
      setIsAvailable(!!p.is_available);
      return p;
    } catch (e) {
      console.warn('[Provider] fetchProfile failed:', e.message);
      return null;
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
      reconcileTracking(token);
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
      reconcileTracking(token);
      const ok = await refreshLocationPermission();
      if (!ok && isAvailableRef.current) {
        setIsAvailable(false);
        try {
          await api.patch('/providers/me/location-revoked', {}, token);
        } catch (e) {
          console.warn('[Provider] location-revoked report failed:', e.message);
        }
        try {
          await Notifications?.scheduleNotificationAsync({
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
        // Explain why before any OS prompt (Play's prominent-disclosure rule);
        // the screen brings the worker online once permission is granted.
        router.push('/permissions?then=online');
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
