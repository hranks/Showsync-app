import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { getAccessToken } from '@/lib/auth';
import { syncDataToSheet } from '@/lib/sheets';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const triggerSync = useCallback(async (updatedEvents: Event[]) => {
    const token = await getAccessToken();
    const settingsStr = localStorage.getItem('dj_settings');
    if (!token || !settingsStr) return;
    try {
      const settings = JSON.parse(settingsStr);
      if (settings.sheetsSyncEnabled && settings.spreadsheetId) {
        const venuesRes = await fetch('/api/venues');
        if (venuesRes.ok) {
          const venues = await venuesRes.json();
          await syncDataToSheet(token, settings.spreadsheetId, updatedEvents, venues);
          console.log('Background sync to Google Sheets completed successfully.');
        }
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        const eventsData = data.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        })).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
        setEvents(eventsData);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(async (event: Omit<Event, 'id'>) => {
    const newEvent = { ...event, id: crypto.randomUUID() };
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, date: newEvent.date.toISOString() })
      });
      if (res.ok) {
        const newEventsList = [newEvent, ...events].sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(newEventsList);
        triggerSync(newEventsList);
      }
    } catch (error) {
      console.error("Error adding event:", error);
    }
  }, [events, triggerSync]);

  const updateEvent = useCallback(async (updatedEvent: Event) => {
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedEvent, date: updatedEvent.date.toISOString() })
      });
      if (res.ok) {
        const newEventsList = events.map(e => e.id === updatedEvent.id ? updatedEvent : e).sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(newEventsList);
        triggerSync(newEventsList);
      }
    } catch (error) {
      console.error("Error updating event:", error);
    }
  }, [events, triggerSync]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const newEventsList = events.filter(e => e.id !== eventId);
        setEvents(newEventsList);
        triggerSync(newEventsList);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  }, [events, triggerSync]);

  return { events, addEvent, updateEvent, deleteEvent, isInitialized };
}
