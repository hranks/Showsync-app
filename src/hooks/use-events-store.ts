import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { getAccessToken, clearGoogleToken, authFetch } from '@/lib/auth';
import { syncDataToSheet } from '@/lib/sheets';
import { useToast } from '@/hooks/use-toast';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useAuthStore } from '@/hooks/use-auth-store';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPulled, setHasPulled] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettingsStore();
  const { isAuthenticated, user } = useAuthStore();

  const triggerSync = useCallback(async (updatedEvents: Event[]) => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }
    try {
      let syncedToSheets = false;
      let syncedToDrive = false;

      if (settings.sheetsSyncEnabled && settings.spreadsheetId) {
        const venuesRes = await authFetch('/api/venues');
        if (venuesRes.ok) {
          const venues = await venuesRes.json();
          await syncDataToSheet(token, settings.spreadsheetId, updatedEvents, venues);
          syncedToSheets = true;
        }
      }

      const driveRes = await authFetch('/api/backup/drive', {
        method: 'POST',
        headers: {
          'X-Google-Access-Token': token
        }
      });
      if (driveRes.ok) {
        syncedToDrive = true;
      }

      if (syncedToSheets || syncedToDrive) {
        toast({
          title: settings.language === 'es' ? 'Sincronización Exitosa' : 'Sync Successful',
          description: settings.language === 'es'
            ? 'Los datos se han sincronizado y respaldado automáticamente.'
            : 'Data has been synced and backed up automatically.',
        });
      }
    } catch (err) {
      console.error('Background sync failed:', err);
      if (err instanceof Error && err.message === 'UNAUTHORIZED_OR_EXPIRED_TOKEN') {
        clearGoogleToken();
      }
      toast({
        title: settings.language === 'es' ? 'Error de Sincronización' : 'Sync Error',
        description: settings.language === 'es' ? 'No se pudo sincronizar automáticamente.' : 'Could not sync automatically.',
        variant: 'destructive',
      });
    }
  }, [settings.sheetsSyncEnabled, settings.spreadsheetId, settings.language, toast]);

  const toLocalDateString = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated || !user?.uid) {
      setEvents([]);
      setIsInitialized(true);
      return;
    }

    try {
      const res = await authFetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        const eventsData = data.map((e: any) => {
          let parsedDate: Date;
          if (typeof e.date === 'string') {
            const datePart = e.date.split('T')[0];
            const parts = datePart.split('-');
            if (parts.length === 3) {
              const y = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10);
              const d = parseInt(parts[2], 10);
              parsedDate = new Date(y, m - 1, d, 12, 0, 0);
            } else {
              const dObj = new Date(e.date);
              parsedDate = new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 12, 0, 0);
            }
          } else {
            const dObj = new Date(e.date);
            parsedDate = new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 12, 0, 0);
          }
          return {
            ...e,
            date: parsedDate
          };
        }).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [isAuthenticated, user?.uid]);

  const pullFromSheets = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || !settings.spreadsheetId) {
      return false;
    }

    try {
      const { fetchDataFromSheet } = await import('@/lib/sheets');
      const data = await fetchDataFromSheet(token, settings.spreadsheetId);

      if (data && (data.events.length > 0 || data.venues.length > 0)) {
        const response = await authFetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: data.events.map(e => ({ ...e, date: toLocalDateString(e.date) })),
            venues: data.venues
          })
        });

        if (response.ok) {
          await fetchEvents();
          window.dispatchEvent(new Event('dj_data_refresh'));
          return true;
        }
      }
    } catch (error) {
      console.error('Error pulling from sheets:', error);
      if (error instanceof Error && error.message === 'UNAUTHORIZED_OR_EXPIRED_TOKEN') {
        clearGoogleToken();
      }
    }
    return false;
  }, [fetchEvents, settings.spreadsheetId]);

  useEffect(() => {
    fetchEvents();
    const handleRefresh = () => {
      fetchEvents();
    };
    window.addEventListener('dj_data_refresh', handleRefresh);
    return () => window.removeEventListener('dj_data_refresh', handleRefresh);
  }, [fetchEvents]);

  useEffect(() => {
    if (isInitialized && isAuthenticated && settings.sheetsSyncEnabled && settings.spreadsheetId && !hasPulled) {
      setHasPulled(true);
      pullFromSheets();
    }
  }, [isInitialized, isAuthenticated, settings.sheetsSyncEnabled, settings.spreadsheetId, hasPulled, pullFromSheets]);

  const addEvent = useCallback(async (event: Omit<Event, 'id'>) => {
    const newEvent = { ...event, id: crypto.randomUUID() };
    try {
      const res = await authFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, date: toLocalDateString(newEvent.date) })
      });
      if (res.ok) {
        const newEventsList = [newEvent, ...events].sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(newEventsList);
        triggerSync(newEventsList);
      }
    } catch (error) {
      console.error('Error adding event:', error);
    }
  }, [events, triggerSync]);

  const updateEvent = useCallback(async (updatedEvent: Event) => {
    try {
      const res = await authFetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedEvent, date: toLocalDateString(updatedEvent.date) })
      });
      if (res.ok) {
        const newEventsList = events
          .map(e => (e.id === updatedEvent.id ? updatedEvent : e))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(newEventsList);
        triggerSync(newEventsList);
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }, [events, triggerSync]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const res = await authFetch(`/api/events?id=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const newEventsList = events.filter(e => e.id !== eventId);
        setEvents(newEventsList);
        triggerSync(newEventsList);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }, [events, triggerSync]);

  return { events, addEvent, updateEvent, deleteEvent, isInitialized, pullFromSheets };
}
