'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DJUser } from '@/types';
import { logout as googleLogout } from '@/lib/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: DJUser | null;
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
        const parsed = JSON.parse(storedAuth);
        if (parsed.isAuthenticated && parsed.user) {
          const u = parsed.user;
          const userObj: DJUser = {
            uid: u.uid || 'usr_default',
            email: u.email || u.usernameOrEmail || '',
            displayName: u.displayName || u.name || 'DJ User',
            stageName: u.stageName || u.name || 'DJ Ranks',
            photoURL: u.photoURL || '',
            spreadsheetId: u.spreadsheetId || ''
          };
          setAuthState({ isAuthenticated: true, user: userObj });
        } else {
          setAuthState({ isAuthenticated: false, user: null });
        }
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

  const loginUser = useCallback((djUser: DJUser) => {
    const newState = { isAuthenticated: true, user: djUser };
    localStorage.setItem('dj_auth', JSON.stringify(newState));
    localStorage.setItem('dj_last_active_user', djUser.uid);
    window.dispatchEvent(new Event('dj_auth_change'));
  }, []);

  const logout = useCallback(async () => {
    try {
      await googleLogout();
    } catch (e) {
      console.warn("Google logout error:", e);
    }
    localStorage.removeItem('dj_auth');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_expiry');
    localStorage.removeItem('google_user_profile');
    setAuthState({ isAuthenticated: false, user: null });
    window.dispatchEvent(new Event('dj_auth_change'));
  }, []);

  // Backward compatibility wrapper
  const login = useCallback((usernameOrEmail: string) => {
    const defaultUser: DJUser = {
      uid: 'usr_default',
      email: usernameOrEmail,
      displayName: usernameOrEmail,
      stageName: usernameOrEmail.split('@')[0] || 'DJ User'
    };
    loginUser(defaultUser);
  }, [loginUser]);

  return { ...authState, loginUser, login, logout, isInitialized };
}
