import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

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
        setEvents(prev => [newEvent, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
      }
    } catch (error) {
      console.error("Error adding event:", error);
    }
  }, []);

  const updateEvent = useCallback(async (updatedEvent: Event) => {
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedEvent, date: updatedEvent.date.toISOString() })
      });
      if (res.ok) {
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e).sort((a, b) => b.date.getTime() - a.date.getTime()));
      }
    } catch (error) {
      console.error("Error updating event:", error);
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, isInitialized };
}
