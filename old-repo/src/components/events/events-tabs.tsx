
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Event } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { EditEventDialog } from './edit-event-dialog';
import { useTranslation } from '@/hooks/use-translation';
import { Skeleton } from '../ui/skeleton';

interface EventsTabsProps {
  events: Event[];
  updateEvent: (event: Event) => void;
  deleteEvent: (eventId: string) => void;
  isInitialized: boolean;
}

export function EventsTabs({ events, updateEvent, deleteEvent, isInitialized }: EventsTabsProps) {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of the day for consistent comparison

    const upcoming = events
      .filter((event) => event.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    setUpcomingEvents(upcoming);

    const past = events
      .filter((event) => event.date < today)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    setPastEvents(past);
  }, [events]);
  
  const handleEdit = (event: Event) => {
    setEditingEvent(event);
  };
  
  const handleUpdate = (updatedEvent: Event) => {
    updateEvent(updatedEvent);
    setEditingEvent(null);
  };

  const columns = useMemo(() => getColumns(handleEdit, deleteEvent, t), [t, deleteEvent]);

  if (!isInitialized) {
    return (
      <div className="space-y-4">
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">{t('events.upcoming')}</TabsTrigger>
            <TabsTrigger value="past">{t('events.past')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">{t('events.upcoming')}</TabsTrigger>
          <TabsTrigger value="past">{t('events.past')}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4">
          <DataTable columns={columns} data={upcomingEvents} />
        </TabsContent>
        <TabsContent value="past" className="space-y-4">
          <DataTable columns={columns} data={pastEvents} />
        </TabsContent>
      </Tabs>
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          onEventUpdate={handleUpdate}
          isOpen={!!editingEvent}
          onOpenChange={(isOpen) => !isOpen && setEditingEvent(null)}
        />
      )}
    </>
  );
}
