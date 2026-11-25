import { useState, useEffect, useCallback } from 'react';
import type { Venue } from '@/types';
import { getAccessToken, clearGoogleToken, authFetch } from '@/lib/auth';
import { syncDataToSheet } from '@/lib/sheets';
import { useToast } from '@/hooks/use-toast';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useAuthStore } from '@/hooks/use-auth-store';

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettingsStore();
  const { isAuthenticated, user } = useAuthStore();

  const triggerSync = useCallback(async (updatedVenues: Venue[]) => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }
    try {
      let syncedToSheets = false;
      let syncedToDrive = false;

      if (settings.sheetsSyncEnabled && settings.spreadsheetId) {
        const eventsRes = await authFetch('/api/events');
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const events = eventsData.map((e: any) => {
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
                parsedDate = new Date(e.date);
              }
            } else {
              parsedDate = new Date(e.date);
            }
            return {
              ...e,
              date: parsedDate
            };
          });
          await syncDataToSheet(token, settings.spreadsheetId, events, updatedVenues);
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

  const fetchVenues = useCallback(async () => {
    if (!isAuthenticated || !user?.uid) {
      setVenues([]);
      setIsInitialized(true);
      return;
    }

    try {
      const res = await authFetch('/api/venues');
      if (res.ok) {
        const data = await res.json();
        setVenues(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [isAuthenticated, user?.uid]);

  useEffect(() => {
    fetchVenues();
    const handleRefresh = () => {
      fetchVenues();
    };
    window.addEventListener('dj_data_refresh', handleRefresh);
    return () => window.removeEventListener('dj_data_refresh', handleRefresh);
  }, [fetchVenues]);

  const addVenue = useCallback(async (venue: Omit<Venue, 'id'>) => {
    const newVenue = { ...venue, id: crypto.randomUUID() };
    try {
      const res = await authFetch('/api/venues', {
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
      console.error('Error adding venue:', error);
    }
  }, [venues, triggerSync]);

  const updateVenue = useCallback(async (updatedVenue: Venue) => {
    try {
      const res = await authFetch('/api/venues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVenue)
      });
      if (res.ok) {
        const newVenuesList = venues
          .map(v => (v.id === updatedVenue.id ? updatedVenue : v))
          .sort((a, b) => a.name.localeCompare(b.name));
        setVenues(newVenuesList);
        triggerSync(newVenuesList);
      }
    } catch (error) {
      console.error('Error updating venue:', error);
    }
  }, [venues, triggerSync]);

  const deleteVenue = useCallback(async (venueId: string) => {
    try {
      const res = await authFetch(`/api/venues?id=${encodeURIComponent(venueId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const newVenuesList = venues.filter(v => v.id !== venueId);
        setVenues(newVenuesList);
        triggerSync(newVenuesList);
      }
    } catch (error) {
      console.error('Error deleting venue:', error);
    }
  }, [venues, triggerSync]);

  return { venues, addVenue, updateVenue, deleteVenue, isInitialized };
}
