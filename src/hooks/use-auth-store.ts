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

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('dj_auth');
      if (storedAuth) {
        setAuthState(JSON.parse(storedAuth));
      }
    } catch (error) {
      console.error("Error fetching auth from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = useCallback((usernameOrEmail: string) => {
    const newState = { isAuthenticated: true, user: { usernameOrEmail } };
    setAuthState(newState);
    localStorage.setItem('dj_auth', JSON.stringify(newState));
  }, []);

  const logout = useCallback(() => {
    const newState = { isAuthenticated: false, user: null };
    setAuthState(newState);
    localStorage.setItem('dj_auth', JSON.stringify(newState));
  }, []);

  return { ...authState, login, logout, isInitialized };
}
