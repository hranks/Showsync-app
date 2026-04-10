'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const defaultSettings: Settings = {
  language: 'en',
  reportEmail: '',
  theme: 'dark',
  username: 'DJ Cool',
  notifications: true,
  reminderTime: '60',
  exportFrequency: 'monthly',
  exportMethod: null,
  cloudBackup: false,
};

// For this simple app, we'll use a hardcoded user ID.
const userId = "default-user";

export function useSettingsStore() {
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const settingsDocRef = doc(db, "users", userId, "settings", "general");

    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettingsState(docSnap.data() as Settings);
      } else {
        // No settings found, so we initialize with defaults
        setDoc(settingsDocRef, defaultSettings);
        setSettingsState(defaultSettings);
      }
      setIsInitialized(true);
    }, (error) => {
      console.error("Error fetching settings from Firestore:", error);
      // Fallback to local default settings on error
      setSettingsState(defaultSettings);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);
  
  const setSettings = useCallback((newSettings: Settings) => {
    if (!userId) return;
    const settingsDocRef = doc(db, "users", userId, "settings", "general");
    // We use setDoc with merge:true to update or create
    setDoc(settingsDocRef, newSettings, { merge: true })
        .catch(error => console.error("Error saving settings:", error));
    // Optimistic update
    setSettingsState(newSettings);
  }, []);


  return { settings, setSettings, isInitialized };
}
