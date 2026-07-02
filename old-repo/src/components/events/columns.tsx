
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Briefcase, PartyPopper, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const EventTypeIcon = ({ type }: { type: 'Club' | 'Corporate' }) => {
  if (type === 'Club') {
    return <PartyPopper className="h-5 w-5 text-primary" />;
  }
  return <Briefcase className="h-5 w-5 text-accent" />;
};

export const getColumns = (
  onEdit: (event: Event) => void,
  onDelete: (eventId: string) => void,
  t: (key: string,
  params?: { [key: string]: string | number } | undefined) => string
): ColumnDef<Event>[] => [
  {
    accessorKey: 'date',
    header: t('columns.date'),
    cell: ({ row }) => {
      const date = row.getValue('date') as Date;
      return <div>{format(date, 'MMM d, yyyy')}</div>;
    },
  },
  {
    accessorKey: 'venueName',
    header: t('columns.venue'),
  },
  {
    accessorKey: 'eventType',
    header: t('columns.type'),
    cell: ({ row }) => {
      const type = row.getValue('eventType') as 'Club' | 'Corporate';
      return (
        <div className="flex items-center gap-2">
          <EventTypeIcon type={type} />
          <span className="font-medium">{t(`eventTypes.${type.toLowerCase()}`)}</span>
        </div>
      );
    },
  },
  {
    header: t('columns.hours'),
    cell: ({ row }) => {
      const hours = row.original.hours;
      const overtime = row.original.overtimeHours;
      const startTime = row.original.startTime;
      const endTime = row.original.endTime;

      if (!startTime || !endTime || hours <= 0) {
        return <Badge variant="outline">{t('columns.needsInfo')}</Badge>;
      }
      return (
        <div>
          <div>
            {hours.toFixed(2)}
            {overtime > 0 ? ` (+${overtime} OT)` : ''}
          </div>
          <div className="text-xs text-muted-foreground">
            {startTime} - {endTime}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalEarnings',
    header: () => <div className="text-right">{t('columns.earnings')}</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalEarnings'));
       if (amount === 0) {
        return <div className="text-right font-medium">-</div>;
      }
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const event = row.original;
      
      const handleDelete = () => {
        onDelete(event.id);
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('columns.actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(event)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('columns.editEvent')}
            </DropdownMenuItem>
             <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('columns.deleteEvent')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
