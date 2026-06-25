import { useState, useEffect, useCallback } from 'react';
import type { Venue } from '@/types';

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedVenues = localStorage.getItem('dj_venues');
      if (storedVenues) {
        const parsed = JSON.parse(storedVenues);
        const venuesData = parsed.sort((a: Venue, b: Venue) => a.name.localeCompare(b.name));
        setVenues(venuesData);
      }
    } catch (error) {
      console.error("Error fetching venues from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const addVenue = useCallback(async (venue: Omit<Venue, 'id'>) => {
    setVenues(prev => {
      const newVenue = { ...venue, id: crypto.randomUUID() };
      const updated = [...prev, newVenue].sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem('dj_venues', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateVenue = useCallback(async (updatedVenue: Venue) => {
    setVenues(prev => {
      const updated = prev.map(v => v.id === updatedVenue.id ? updatedVenue : v).sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem('dj_venues', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteVenue = useCallback(async (venueId: string) => {
    setVenues(prev => {
      const updated = prev.filter(v => v.id !== venueId);
      localStorage.setItem('dj_venues', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { venues, addVenue, updateVenue, deleteVenue, isInitialized };
}
