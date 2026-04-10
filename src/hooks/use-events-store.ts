'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp, query } from 'firebase/firestore';

// For this simple app, we'll use a hardcoded user ID.
// In a real multi-user app, you would get this from an authentication service.
const userId = "default-user";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const eventsCollectionRef = collection(db, "users", userId, "events");
    const q = query(eventsCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const eventsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
            } as Event;
        });
        // Sort the events on the client side after fetching.
        eventsData.sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(eventsData);
        setIsInitialized(true);
    }, (error) => {
      console.error("Error fetching events from Firestore:", error);
      setIsInitialized(true); // Still mark as initialized to not block UI
    });

    return () => unsubscribe();
  }, []);

  const addEvent = useCallback(async (event: Omit<Event, 'id'>) => {
    if (!userId) return;
    try {
      const eventsCollectionRef = collection(db, "users", userId, "events");
      // Convert JavaScript Date to Firestore Timestamp before saving
      await addDoc(eventsCollectionRef, {
        ...event,
        date: Timestamp.fromDate(event.date),
      });
    } catch (error) {
      console.error("Error adding event to Firestore:", error);
    }
  }, []);

  const updateEvent = useCallback(async (updatedEvent: Event) => {
    if (!userId) return;
    try {
      const eventRef = doc(db, "users", userId, "events", updatedEvent.id);
      // Omit id from the object to be updated and convert date
      const { id, ...dataToUpdate } = updatedEvent;
      await updateDoc(eventRef, {
        ...dataToUpdate,
        date: Timestamp.fromDate(updatedEvent.date),
      });
    } catch (error) {
      console.error("Error updating event in Firestore:", error);
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!userId) return;
    try {
        const eventRef = doc(db, "users", userId, "events", eventId);
        await deleteDoc(eventRef);
    } catch (error) {
        console.error("Error deleting event from Firestore:", error);
    }
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, isInitialized };
}
