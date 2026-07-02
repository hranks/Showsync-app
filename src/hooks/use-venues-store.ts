import { useState, useEffect, useCallback } from 'react';
import type { Venue } from '@/types';
import { getAccessToken } from '@/lib/auth';
import { syncDataToSheet } from '@/lib/sheets';

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const triggerSync = useCallback(async (updatedVenues: Venue[]) => {
    const token = await getAccessToken();
    const settingsStr = localStorage.getItem('dj_settings');
    if (!token || !settingsStr) return;
    try {
      const settings = JSON.parse(settingsStr);
      if (settings.sheetsSyncEnabled && settings.spreadsheetId) {
        const eventsRes = await fetch('/api/events');
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const events = eventsData.map((e: any) => ({
            ...e,
            date: new Date(e.date)
          }));
          await syncDataToSheet(token, settings.spreadsheetId, events, updatedVenues);
          console.log('Background sync to Google Sheets completed successfully.');
        }
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }, []);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await fetch('/api/venues');
      if (res.ok) {
        const data = await res.json();
        setVenues(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const addVenue = useCallback(async (venue: Omit<Venue, 'id'>) => {
    const newVenue = { ...venue, id: crypto.randomUUID() };
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVenue)
      });
      if (res.ok) {
        const newVenuesList = [...venues, newVenue].sort((a, b) => a.name.localeCompare(b.name));
        setVenues(newVenuesList);
        triggerSync(newVenuesList);
      }
    } catch (error) {
      console.error("Error adding venue:", error);
    }
  }, [venues, triggerSync]);

  const updateVenue = useCallback(async (updatedVenue: Venue) => {
    try {
      const res = await fetch('/api/venues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVenue)
      });
      if (res.ok) {
        const newVenuesList = venues.map(v => v.id === updatedVenue.id ? updatedVenue : v).sort((a, b) => a.name.localeCompare(b.name));
        setVenues(newVenuesList);
        triggerSync(newVenuesList);
      }
    } catch (error) {
      console.error("Error updating venue:", error);
    }
  }, [venues, triggerSync]);

  const deleteVenue = useCallback(async (venueId: string) => {
    try {
      const res = await fetch(`/api/venues?id=${venueId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const newVenuesList = venues.filter(v => v.id !== venueId);
        setVenues(newVenuesList);
        triggerSync(newVenuesList);
      }
    } catch (error) {
      console.error("Error deleting venue:", error);
    }
  }, [venues, triggerSync]);

  return { venues, addVenue, updateVenue, deleteVenue, isInitialized };
}
