
'use client';

import * as React from 'react';
import type { Event } from '@/types';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card } from '../ui/card';
import { useTranslation } from '@/hooks/use-translation';

interface ReportsTableProps {
  events: Event[];
}

export function ReportsTable({ events }: ReportsTableProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number, currency: 'NIO' | 'USD') => {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    return `C$${amount.toFixed(2)}`;
  };
  
  const totals = React.useMemo(() => {
    return events.reduce((acc, event) => {
        const pendingUSD = (event.totalEarnings || 0) - (event.paymentAdvanceUSD || 0) - (event.consumptionsUSD || 0);

        acc.totalHours += event.hours || 0;
        acc.totalEarningsUSD += event.totalEarnings || 0;
        acc.totalAdvanceUSD += event.paymentAdvanceUSD || 0;
        acc.totalAdvanceNIO += event.paymentAdvanceNIO || 0;
        acc.totalConsumptionsUSD += event.consumptionsUSD || 0;
        acc.totalConsumptionsNIO += event.consumptionsNIO || 0;
        acc.pendingPaymentUSD += pendingUSD;
        return acc;
    }, {
        totalHours: 0,
        totalEarningsUSD: 0,
        totalAdvanceUSD: 0,
        totalAdvanceNIO: 0,
        totalConsumptionsUSD: 0,
        totalConsumptionsNIO: 0,
        pendingPaymentUSD: 0,
    })
  }, [events]);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('reportsTable.venue')}</TableHead>
            <TableHead>{t('reportsTable.date')}</TableHead>
            <TableHead>{t('reportsTable.schedule')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.totalHours')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.totalPay')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.advanceUSD')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.advanceNIO')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.consumptionsUSD')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.consumptionsNIO')}</TableHead>
            <TableHead className="text-right">{t('reportsTable.pendingUSD')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length > 0 ? (
            events.map((event) => {
               const pendingUSD = (event.totalEarnings || 0) - (event.paymentAdvanceUSD || 0) - (event.consumptionsUSD || 0);
                
              return (
              <TableRow key={event.id}>
                <TableCell>{event.venueName}</TableCell>
                <TableCell>{format(event.date, 'MMM d, yyyy')}</TableCell>
                <TableCell>{event.startTime && event.endTime ? `${event.startTime} - ${event.endTime}` : '-'}</TableCell>
                <TableCell className="text-right">{event.hours > 0 ? event.hours.toFixed(2) : ''}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(event.totalEarnings || 0, 'USD')}</TableCell>
                <TableCell className="text-right">{event.paymentAdvanceUSD ? formatCurrency(event.paymentAdvanceUSD, 'USD') : '-'}</TableCell>
                <TableCell className="text-right">{event.paymentAdvanceNIO ? formatCurrency(event.paymentAdvanceNIO, 'NIO') : '-'}</TableCell>
                <TableCell className="text-right">{event.consumptionsUSD ? formatCurrency(event.consumptionsUSD, 'USD') : '-'}</TableCell>
                <TableCell className="text-right">{event.consumptionsNIO ? formatCurrency(event.consumptionsNIO, 'NIO') : '-'}</TableCell>
                <TableCell className="text-right font-medium text-green-600">{formatCurrency(pendingUSD, 'USD')}</TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                {t('reportsTable.noEvents')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
         <TableFooter>
            <TableRow>
                <TableCell colSpan={3} className="font-bold">{t('reportsTable.totals')}</TableCell>
                <TableCell className="text-right font-bold">{totals.totalHours.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.totalEarningsUSD, 'USD')}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.totalAdvanceUSD, 'USD')}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.totalAdvanceNIO, 'NIO')}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.totalConsumptionsUSD, 'USD')}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.totalConsumptionsNIO, 'NIO')}</TableCell>
                <TableCell className="text-right font-bold text-green-600">{formatCurrency(totals.pendingPaymentUSD, 'USD')}</TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    </Card>
  );
}
