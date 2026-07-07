'use client';

import React, { useState } from 'react';

import { AddEventDialog } from '@/components/events/add-event-dialog';
import { EventsTabs } from '@/components/events/events-tabs';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/use-events-store';
import { PlusCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useSettingsStore } from '@/hooks/use-settings-store';

export default function EventsPage() {
  const { events, addEvent, updateEvent, deleteEvent, isInitialized, pullFromSheets } = useEvents();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { settings } = useSettingsStore();
  const [isPulling, setIsPulling] = useState(false);

  const handlePullFromSheets = async () => {
    setIsPulling(true);
    const success = await pullFromSheets();
    setIsPulling(false);
    
    if (success) {
      toast({
        title: settings.language === 'es' ? 'Datos Actualizados' : 'Data Updated',
        description: settings.language === 'es' ? 'Se han actualizado los eventos desde Google Sheets.' : 'Events have been updated from Google Sheets.'
      });
    } else {
      toast({
        title: settings.language === 'es' ? 'Error al actualizar' : 'Failed to update',
        description: settings.language === 'es' ? 'No se pudo sincronizar con Google Sheets.' : 'Could not sync with Google Sheets.',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t('events.title')}</h2>
          <div className="flex items-center space-x-2">
             {settings.sheetsSyncEnabled && settings.spreadsheetId && (
               <Button variant="outline" onClick={handlePullFromSheets} disabled={isPulling}>
                 {isPulling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                 {settings.language === 'es' ? 'Sincronizar' : 'Sync'}
               </Button>
             )}
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
