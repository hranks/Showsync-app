import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/types';
import { useAuthStore } from './use-auth-store';
import { authFetch } from '@/lib/auth';

const defaultSettings: Settings = {
  language: 'es',
  theme: 'dark',
  sheetsSyncEnabled: false,
  spreadsheetId: '',
  reportEmail: '',
  username: '',
  notifications: false,
  reminderTime: '15',
  exportFrequency: 'weekly',
  exportMethod: null,
  cloudBackup: false
};

export const SettingsContext = createContext<{
  settings: Settings;
  setSettings: (newSettings: Settings) => void;
  isInitialized: boolean;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, updateAuthUser } = useAuthStore();
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  const getStorageKey = useCallback(() => {
    if (isAuthenticated && user?.uid) {
      return `dj_settings_${user.uid}`;
    }
    return 'dj_settings';
  }, [isAuthenticated, user?.uid]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const key = getStorageKey();
        const storedSettings = localStorage.getItem(key);
        const currentSettings = storedSettings ? JSON.parse(storedSettings) : null;

        if (isAuthenticated && user?.uid) {
          try {
            const res = await authFetch('/api/user-settings');
            if (res.ok) {
              const data = await res.json();
              if (data && data.settings && active) {
                const combined = { ...defaultSettings, ...data.settings };
                setSettingsState(combined);
                localStorage.setItem(key, JSON.stringify(combined));
                return;
              }
            }
          } catch (serverError) {
            console.error('Failed to load settings from server, falling back to localStorage', serverError);
          }
        }

        if (currentSettings && active) {
          setSettingsState({ ...defaultSettings, ...currentSettings });
        } else if (active) {
          const initialUserSettings: Settings = {
            ...defaultSettings,
            username: user?.stageName || user?.displayName || '',
            reportEmail: user?.email || '',
            spreadsheetId: user?.spreadsheetId || '',
            sheetsSyncEnabled: Boolean(user?.spreadsheetId),
          };
          setSettingsState(initialUserSettings);
          localStorage.setItem(key, JSON.stringify(initialUserSettings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        if (active) setSettingsState(defaultSettings);
      } finally {
        if (active) setIsInitialized(true);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [getStorageKey, isAuthenticated, user?.uid, user?.stageName, user?.displayName, user?.email, user?.spreadsheetId]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, [settings.theme]);

  const setSettings = useCallback(async (newSettings: Settings) => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(newSettings));
      setSettingsState(newSettings);

      if (isAuthenticated && user?.uid) {
        if (newSettings.spreadsheetId !== user.spreadsheetId) {
          updateAuthUser({ spreadsheetId: newSettings.spreadsheetId || '' });
        }
        try {
          await authFetch('/api/user-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ settings: newSettings }),
          });
        } catch (serverErr) {
          console.error('Failed to save settings to server:', serverErr);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [getStorageKey, isAuthenticated, user?.uid, user?.spreadsheetId, updateAuthUser]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, isInitialized }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsStore() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: defaultSettings,
      setSettings: () => {},
      isInitialized: false
    };
  }
  return context;
}
