'use client';

import React from 'react';

import { AddEventDialog } from '@/components/events/add-event-dialog';
import { EventsTabs } from '@/components/events/events-tabs';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/use-events-store';
import { PlusCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export default function EventsPage() {
  const { events, addEvent, updateEvent, deleteEvent, isInitialized } = useEvents();
  const { t } = useTranslation();

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t('events.title')}</h2>
          <div className="flex items-center space-x-2">
             <AddEventDialog onEventAdd={addEvent}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('events.addEvent')}
              </Button>
            </AddEventDialog>
          </div>
        </div>
        <EventsTabs 
          events={events} 
          updateEvent={updateEvent} 
          deleteEvent={deleteEvent}
          isInitialized={isInitialized}
        />
      </div>
    </>
  );
}
