import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@utils/api';
import { useAuth } from '@context/auth';

const ProviderContext = createContext({});

export function ProviderProvider({ children }) {
  const { token } = useAuth();
  const [profile,       setProfile]       = useState(null);
  const [isAvailable,   setIsAvailable]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

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
    } else {
      setProfile(null);
      setIsAvailable(false);
      setProfileLoaded(false);
    }
  }, [token]);

  const toggleAvailability = useCallback(async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await api.patch('/providers/me/availability', { is_available: next }, token);
    } catch (e) {
      setIsAvailable(!next);
    }
  }, [isAvailable, token]);

  return (
    <ProviderContext.Provider value={{ profile, isAvailable, loading, profileLoaded, fetchProfile, toggleAvailability, setProfile }}>
      {children}
    </ProviderContext.Provider>
  );
}

export const useProvider = () => useContext(ProviderContext);
