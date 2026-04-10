'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

interface MonthlyIncomeChartProps {
  events: Event[];
}

export function MonthlyIncomeChart({ events }: MonthlyIncomeChartProps) {
  const [data, setData] = useState<{name: string, total: number}[] | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const monthlyData: { [key: string]: number } = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString('default', { month: 'short' });
      monthlyData[monthKey] = 0;
    }

    events.forEach((event) => {
      const monthKey = event.date.toLocaleString('default', { month: 'short' });
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += event.totalEarnings;
      }
    });
    
    setData(Object.keys(monthlyData).map(name => ({ name, total: monthlyData[name] })));
  }, [events]);

  return (
    <Card className="lg:col-span-4 col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.income.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
       {!data ? (
          <div className="flex items-end justify-around h-[350px] px-4">
             <Skeleton className="h-[150px] w-12" />
             <Skeleton className="h-[250px] w-12" />
             <Skeleton className="h-[100px] w-12" />
             <Skeleton className="h-[300px] w-12" />
             <Skeleton className="h-[180px] w-12" />
             <Skeleton className="h-[220px] w-12" />
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--card))' }}
              contentStyle={{ 
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
              }}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
