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
    try {
      const key = getStorageKey();
      const storedSettings = localStorage.getItem(key);
      if (storedSettings) {
        setSettingsState({ ...defaultSettings, ...JSON.parse(storedSettings) });
      } else {
        // Fallback to general settings or defaults
        const generalSettings = localStorage.getItem('dj_settings');
        if (generalSettings) {
          const parsed = JSON.parse(generalSettings);
          setSettingsState({ ...defaultSettings, ...parsed });
          localStorage.setItem(key, JSON.stringify(parsed));
        } else {
          localStorage.setItem(key, JSON.stringify(defaultSettings));
          setSettingsState(defaultSettings);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettingsState(defaultSettings);
    } finally {
      setIsInitialized(true);
    }
  }, [getStorageKey]);

  // Instantly apply theme class to the document root
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const setSettings = useCallback((newSettings: Settings) => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    setSettingsState(newSettings);
  }, [getStorageKey]);

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

