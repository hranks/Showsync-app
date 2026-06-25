import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedEvents = localStorage.getItem('dj_events');
      if (storedEvents) {
        const parsed = JSON.parse(storedEvents);
        // Convert string formatted dates back to Date objects
        const eventsData = parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        })).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
        setEvents(eventsData);
      }
    } catch (error) {
      console.error("Error fetching events from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const addEvent = useCallback(async (event: Omit<Event, 'id'>) => {
    setEvents(prev => {
      const newEvent = { ...event, id: crypto.randomUUID() };
      const updated = [newEvent, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime());
      localStorage.setItem('dj_events', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateEvent = useCallback(async (updatedEvent: Event) => {
    setEvents(prev => {
      const updated = prev.map(e => e.id === updatedEvent.id ? updatedEvent : e).sort((a, b) => b.date.getTime() - a.date.getTime());
      localStorage.setItem('dj_events', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    setEvents(prev => {
      const updated = prev.filter(e => e.id !== eventId);
      localStorage.setItem('dj_events', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, isInitialized };
}
