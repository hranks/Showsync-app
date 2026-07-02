
// This file is no longer the source of truth for events, 
// as they are now fetched from Firestore.
// It was used to seed the database with initial data.
import type { Event } from '@/types';

export const initialEvents: Omit<Event, 'id'>[] = [];
