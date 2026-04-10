'use client';

import * as React from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

interface EventBreakdownChartProps {
  events: Event[];
}

const COLORS = {
  Club: 'hsl(var(--primary))',
  Corporate: 'hsl(var(--accent))',
};

export function EventBreakdownChart({ events }: EventBreakdownChartProps) {
  const [data, setData] = React.useState<({name: string; value: number})[] | null>(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    const now = new Date();
    const currentMonthEvents = events.filter(
      (event) =>
        event.date.getMonth() === now.getMonth() &&
        event.date.getFullYear() === now.getFullYear()
    );

    const breakdown = currentMonthEvents.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    setData(Object.entries(breakdown).map(([name, value]) => ({ name, value })));
  }, [events]);

  return (
    <Card className="lg:col-span-3 col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.breakdown.title')}</CardTitle>
        <CardDescription>{t('dashboard.breakdown.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
           <div className="flex items-center justify-center h-[350px]">
            <Skeleton className="w-[300px] h-[300px] rounded-full" />
           </div>
        ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Tooltip
              cursor={{ fill: 'hsl(var(--card))' }}
              contentStyle={{ 
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              innerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${t(`eventTypes.${name.toLowerCase()}`)} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            {t('dashboard.breakdown.noEvents')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
