'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { DJUser } from '@/types';
import {
  auth,
  logout as googleLogout,
  getAppSessionToken,
  setAppSessionToken,
  restoreSessionFromFirebase,
} from '@/lib/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: DJUser | null;
}

const AUTH_PROFILE_KEY = 'dj_auth_profile';

export function useAuthStore() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const syncFromState = useCallback(async () => {
    try {
      const token = getAppSessionToken();
      const storedProfile = localStorage.getItem(AUTH_PROFILE_KEY);

      if (token && storedProfile) {
        const parsed = JSON.parse(storedProfile) as DJUser;
        setAuthState({ isAuthenticated: true, user: parsed });
        setIsInitialized(true);
        return;
      }

      // If Firebase still has an active Google session, restore the backend session token in memory
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({}),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.sessionToken && data.user) {
            setAppSessionToken(data.sessionToken);
            localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(data.user));
            setAuthState({ isAuthenticated: true, user: data.user });
            setIsInitialized(true);
            return;
          }
        }
      }

      // No active session token in memory
      localStorage.removeItem(AUTH_PROFILE_KEY);
      localStorage.removeItem('dj_auth');
      setAuthState({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Error initializing auth state:', error);
      setAuthState({ isAuthenticated: false, user: null });
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    // Wait for Firebase Auth initial state resolution once
    const unsubFirebase = onAuthStateChanged(auth, () => {
      syncFromState();
    });

    const handleCustomChange = () => {
      const token = getAppSessionToken();
      const storedProfile = localStorage.getItem(AUTH_PROFILE_KEY);
      if (token && storedProfile) {
        try {
          setAuthState({ isAuthenticated: true, user: JSON.parse(storedProfile) });
        } catch {
          setAuthState({ isAuthenticated: false, user: null });
        }
      } else {
        setAuthState({ isAuthenticated: false, user: null });
      }
    };

    window.addEventListener('dj_auth_change', handleCustomChange);
    return () => {
      unsubFirebase();
      window.removeEventListener('dj_auth_change', handleCustomChange);
    };
  }, [syncFromState]);

  const loginUser = useCallback((djUser: DJUser, sessionToken?: string) => {
    if (sessionToken) {
      setAppSessionToken(sessionToken);
    }
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(djUser));
    // Remove legacy storage keys if present
    localStorage.removeItem('dj_auth');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_expiry');
    localStorage.removeItem('google_user_profile');
    setAuthState({ isAuthenticated: true, user: djUser });
    window.dispatchEvent(new Event('dj_auth_change'));
  }, []);

  const updateAuthUser = useCallback((partial: Partial<DJUser>) => {
    setAuthState((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...partial };
      localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await googleLogout();
    } catch (e) {
      console.warn('Google logout error:', e);
    }
    localStorage.removeItem(AUTH_PROFILE_KEY);
    localStorage.removeItem('dj_auth');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_expiry');
    localStorage.removeItem('google_user_profile');
    setAuthState({ isAuthenticated: false, user: null });
    window.dispatchEvent(new Event('dj_auth_change'));
  }, []);

  // Ensure session helper for callers
  const ensureSession = useCallback(async () => {
    return await restoreSessionFromFirebase();
  }, []);

  return {
    ...authState,
    loginUser,
    updateAuthUser,
    logout,
    ensureSession,
    isInitialized,
  };
}
