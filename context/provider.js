import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '@utils/api';
import { useAuth } from '@context/auth';

const ProviderContext = createContext({});

export function ProviderProvider({ children }) {
  const { token } = useAuth();
  const [profile,      setProfile]      = useState(null);
  const [isAvailable,  setIsAvailable]  = useState(false);
  const [loading,      setLoading]      = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/providers/me', token);
      const p   = res.data;
      setProfile(p);
      setIsAvailable(!!p.is_available);
    } catch (e) {
      console.warn('[Provider] fetchProfile failed:', e.message);
    } finally {
      setLoading(false);
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
    <ProviderContext.Provider value={{ profile, isAvailable, loading, fetchProfile, toggleAvailability, setProfile }}>
      {children}
    </ProviderContext.Provider>
  );
}

export const useProvider = () => useContext(ProviderContext);
