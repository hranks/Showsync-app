import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/types';

const defaultSettings: Settings = {
  language: 'en',
  theme: 'dark',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY'
};

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('dj_settings');
      if (storedSettings) {
        setSettingsState({ ...defaultSettings, ...JSON.parse(storedSettings) });
      } else {
        localStorage.setItem('dj_settings', JSON.stringify(defaultSettings));
        setSettingsState(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching settings from localStorage:", error);
      setSettingsState(defaultSettings);
    } finally {
      setIsInitialized(true);
    }
  }, []);
  
  const setSettings = useCallback((newSettings: Settings) => {
    try {
      localStorage.setItem('dj_settings', JSON.stringify(newSettings));
    } catch(error) {
      console.error("Error saving settings to localStorage:", error);
    }
    setSettingsState(newSettings);
  }, []);

  return { settings, setSettings, isInitialized };
}
