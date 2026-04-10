'use client';
import { useEffect, useState } from 'react';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface NextEventCardProps {
  events: Event[];
}

export function NextEventCard({ events }: NextEventCardProps) {
  const [nextEvent, setNextEvent] = useState<Event | undefined>(undefined);
  const [timeLeft, setTimeLeft] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { t, settings } = useTranslation();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const calculateNextEvent = () => {
      const now = new Date();
      const upcoming = events
        .filter((event) => event.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      const next = upcoming[0];
      setNextEvent(next);

      if (next) {
        const timeDiff = next.date.getTime() - now.getTime();
        const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${daysLeft > 0 ? `${daysLeft}d` : ''} ${hoursLeft}h away`);
      }
    };

    calculateNextEvent();
    const timer = setInterval(calculateNextEvent, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [events, isClient]);

  if (!isClient) {
    // Render a placeholder on the server and initial client render
    return (
       <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.nextEvent.title')}</CardTitle>
           <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('dashboard.nextEvent.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!nextEvent) {
    return (
       <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.nextEvent.title')}</CardTitle>
           <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('dashboard.nextEvent.noEvents')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 bg-primary/10 border-primary">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">{t('dashboard.nextEvent.title')}</CardTitle>
        <div className="text-sm font-medium text-right">
            {timeLeft}
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="text-2xl font-bold text-primary">{nextEvent.venueName}</h3>
        <div className="flex items-center text-muted-foreground pt-2">
          <Calendar className="mr-2 h-4 w-4" />
          <span>{nextEvent.date.toLocaleDateString(settings.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <Clock className="mr-2 h-4 w-4" />
          <span>{nextEvent.startTime}</span>
        </div>
      </CardContent>
    </Card>
  );
}
