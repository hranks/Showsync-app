'use client';

import { useState, useEffect } from 'react';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, Clock, BarChart, TrendingUp } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

interface PerformanceStatsProps {
  events: Event[];
}

interface MonthlyStats {
  totalIncome: number;
  totalHours: number;
  totalGigs: number;
  avgPerHour: number;
}

export function PerformanceStats({ events }: PerformanceStatsProps) {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const now = new Date();
    const currentMonthEvents = events.filter(
      (event) =>
        event.date.getMonth() === now.getMonth() &&
        event.date.getFullYear() === now.getFullYear()
    );

    const totalIncome = currentMonthEvents.reduce((acc, event) => acc + event.totalEarnings, 0);
    const totalHours = currentMonthEvents.reduce((acc, event) => acc + event.hours + event.overtimeHours, 0);
    const totalGigs = currentMonthEvents.length;
    const avgPerHour = totalHours > 0 ? totalIncome / totalHours : 0;
    
    setStats({ totalIncome, totalHours, totalGigs, avgPerHour });
  }, [events]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.monthlyIncome')}</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.monthlyHours')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.totalGigs')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.avgRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border-border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t('dashboard.stats.monthlyIncome')}</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <Banknote className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">{formatCurrency(stats.totalIncome)}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.gigsCount', {count: stats.totalGigs})}</p>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t('dashboard.stats.monthlyHours')}</CardTitle>
          <div className="p-2 rounded-lg bg-accent/10">
            <Clock className="h-4 w-4 text-accent" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">{stats.totalHours}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.hoursWorked')}</p>
        </CardContent>
      </Card>
       <Card className="overflow-hidden border-border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t('dashboard.stats.totalGigs')}</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">+{stats.totalGigs}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.eventsPlayed')}</p>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t('dashboard.stats.avgRate')}</CardTitle>
          <div className="p-2 rounded-lg bg-accent/10">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">{formatCurrency(stats.avgPerHour)}<span className="text-sm font-medium text-muted-foreground">/hr</span></div>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.avgRateDescription')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
