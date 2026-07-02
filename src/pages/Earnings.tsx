
'use client';

import React from 'react';

import { MonthlyIncomeChart } from '@/components/dashboard/monthly-income-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/events/data-table';
import { getColumns } from '@/components/events/columns';
import { useEvents } from '@/hooks/use-events-store';
import { Event } from '@/types';
import { EditEventDialog } from '@/components/events/edit-event-dialog';
import { useTranslation } from '@/hooks/use-translation';
import { Skeleton } from '@/components/ui/skeleton';

export default function EarningsPage() {
  const { events, updateEvent, deleteEvent, isInitialized } = useEvents();
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const { t } = useTranslation();

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
  };
  
  const handleUpdate = (updatedEvent: Event) => {
    updateEvent(updatedEvent);
    setEditingEvent(null);
  };

  const columns = React.useMemo(() => getColumns(handleEdit, deleteEvent, t), [t, deleteEvent]);

  if (!isInitialized) {
      return (
          <>
              <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                  <Skeleton className="h-8 w-48" />
                  <div className="space-y-4">
                      <Skeleton className="h-80" />
                      <Card>
                          <CardHeader>
                              <Skeleton className="h-6 w-32" />
                          </CardHeader>
                          <CardContent>
                              <Skeleton className="h-48" />
                          </CardContent>
                      </Card>
                  </div>
              </div>
          </>
      )
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">{t('earnings.title')}</h2>
        <div className="space-y-4">
          <MonthlyIncomeChart events={events} />
          <Card>
            <CardHeader>
              <CardTitle>{t('earnings.allGigs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={events} />
            </CardContent>
          </Card>
        </div>
      </div>
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
