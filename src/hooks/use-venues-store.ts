'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Venue } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

// For this simple app, we'll use a hardcoded user ID.
const userId = "default-user";

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const venuesCollectionRef = collection(db, "users", userId, "venues");
    const q = query(venuesCollectionRef, orderBy("name"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const venuesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Venue;
      });
      setVenues(venuesData);
      setIsInitialized(true);
    }, (error) => {
      console.error("Error fetching venues from Firestore:", error);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const addVenue = useCallback(async (venue: Omit<Venue, 'id'>) => {
    if (!userId) return;
    try {
      const venuesCollectionRef = collection(db, "users", userId, "venues");
      await addDoc(venuesCollectionRef, venue);
    } catch (error) {
      console.error("Error adding venue to Firestore:", error);
    }
  }, []);

  const updateVenue = useCallback(async (updatedVenue: Venue) => {
    if (!userId || !updatedVenue.id) return;
    try {
      const venueRef = doc(db, "users", userId, "venues", updatedVenue.id);
      const { id, ...dataToUpdate } = updatedVenue;
      await updateDoc(venueRef, dataToUpdate);
    } catch (error) {
      console.error("Error updating venue in Firestore:", error);
    }
  }, []);

  const deleteVenue = useCallback(async (venueId: string) => {
    if (!userId) return;
    try {
        const venueRef = doc(db, "users", userId, "venues", venueId);
        await deleteDoc(venueRef);
    } catch (error) {
        console.error("Error deleting venue from Firestore:", error);
    }
  }, []);

  return { venues, addVenue, updateVenue, deleteVenue, isInitialized };
}
