'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { NextEventCard } from '@/components/dashboard/next-event-card';
import { PerformanceStats } from '@/components/dashboard/performance-stats';
import { MonthlyIncomeChart } from '@/components/dashboard/monthly-income-chart';
import { EventBreakdownChart } from '@/components/dashboard/event-breakdown-chart';
import { useEvents } from '@/hooks/use-events-store';
import { AddEventDialog } from '@/components/events/add-event-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { events, addEvent, isInitialized } = useEvents();
  const { t } = useTranslation();
  
  if (!isInitialized) {
    return (
       <AppLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-32 col-span-4" />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
             </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="lg:col-span-4 col-span-1 h-80" />
                <Skeleton className="lg:col-span-3 col-span-1 h-80" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="font-display text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent">{t('dashboard.title')}</h2>
          <div className="flex items-center space-x-2">
            <AddEventDialog onEventAdd={addEvent}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('dashboard.addEvent')}
              </Button>
            </AddEventDialog>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <NextEventCard events={events} />
          </div>
          <PerformanceStats events={events} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <MonthlyIncomeChart events={events} />
            <EventBreakdownChart events={events} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
