'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    usernameOrEmail: string;
  } | null;
}

export function useAuthStore() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const loadAuth = useCallback(() => {
    try {
      const storedAuth = localStorage.getItem('dj_auth');
      if (storedAuth) {
        setAuthState(JSON.parse(storedAuth));
      } else {
        setAuthState({ isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error("Error fetching auth from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dj_auth') {
        loadAuth();
      }
    };
    
    // Custom event for same-window updates
    const handleCustomChange = () => {
      loadAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dj_auth_change', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dj_auth_change', handleCustomChange);
    };
  }, [loadAuth]);

  const login = useCallback((usernameOrEmail: string) => {
    const newState = { isAuthenticated: true, user: { usernameOrEmail } };
    localStorage.setItem('dj_auth', JSON.stringify(newState));
    window.dispatchEvent(new Event('dj_auth_change'));
  }, []);

  const logout = useCallback(() => {
    const newState = { isAuthenticated: false, user: null };
    localStorage.setItem('dj_auth', JSON.stringify(newState));
    window.dispatchEvent(new Event('dj_auth_change'));
  }, []);

  return { ...authState, login, logout, isInitialized };
}
