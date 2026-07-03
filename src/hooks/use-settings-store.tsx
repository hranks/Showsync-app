import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/types';
import { useAuthStore } from './use-auth-store';

const defaultSettings: Settings = {
  language: 'es',
  theme: 'dark',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
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
  const { user, isAuthenticated } = useAuthStore();
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  // Determine key dynamically per user
  const getStorageKey = useCallback(() => {
    if (isAuthenticated && user?.usernameOrEmail) {
      return `dj_settings_${user.usernameOrEmail}`;
    }
    return 'dj_settings';
  }, [isAuthenticated, user]);

  // Load settings when user logs in or out
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const key = getStorageKey();
        const storedSettings = localStorage.getItem(key);
        let currentSettings = storedSettings ? JSON.parse(storedSettings) : null;

        if (isAuthenticated && user?.usernameOrEmail) {
          // Attempt to load from server
          try {
            const res = await fetch(`/api/user-settings?user=${encodeURIComponent(user.usernameOrEmail)}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.settings) {
                if (active) {
                  const combined = { ...defaultSettings, ...data.settings };
                  setSettingsState(combined);
                  localStorage.setItem(key, JSON.stringify(combined));
                  return;
                }
              }
            }
          } catch (serverError) {
            console.error("Failed to load settings from server, falling back to localStorage", serverError);
          }
        }

        // Local storage / default fallback
        if (currentSettings) {
          if (active) {
            setSettingsState({ ...defaultSettings, ...currentSettings });
          }
        } else {
          const generalSettings = localStorage.getItem('dj_settings');
          if (generalSettings) {
            const parsed = JSON.parse(generalSettings);
            if (active) {
              setSettingsState({ ...defaultSettings, ...parsed });
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } else {
            if (active) {
              setSettingsState(defaultSettings);
              localStorage.setItem(key, JSON.stringify(defaultSettings));
            }
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        if (active) setSettingsState(defaultSettings);
      } finally {
        if (active) setIsInitialized(true);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [getStorageKey, isAuthenticated, user]);

  // Instantly apply theme class to the document root
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const setSettings = useCallback(async (newSettings: Settings) => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(newSettings));
      setSettingsState(newSettings);

      // If authenticated, also update on the server
      if (isAuthenticated && user?.usernameOrEmail) {
        try {
          await fetch('/api/user-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user: user.usernameOrEmail,
              settings: newSettings,
            }),
          });
        } catch (serverErr) {
          console.error("Failed to save settings to server:", serverErr);
        }
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }, [getStorageKey, isAuthenticated, user]);

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

