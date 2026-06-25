import { useState, useEffect, useCallback } from 'react';
import type { Venue } from '@/types';

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

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
        setVenues(prev => [...prev, newVenue].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error("Error adding venue:", error);
    }
  }, []);

  const updateVenue = useCallback(async (updatedVenue: Venue) => {
    try {
      const res = await fetch('/api/venues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVenue)
      });
      if (res.ok) {
        setVenues(prev => prev.map(v => v.id === updatedVenue.id ? updatedVenue : v).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error("Error updating venue:", error);
    }
  }, []);

  const deleteVenue = useCallback(async (venueId: string) => {
    try {
      const res = await fetch(`/api/venues?id=${venueId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVenues(prev => prev.filter(v => v.id !== venueId));
      }
    } catch (error) {
      console.error("Error deleting venue:", error);
    }
  }, []);

  return { venues, addVenue, updateVenue, deleteVenue, isInitialized };
}
