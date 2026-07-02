'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AddEventForm } from './add-event-form';
import type { Event } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/use-translation';

interface AddEventDialogProps {
  children: React.ReactNode;
  onEventAdd: (event: Omit<Event, 'id'>) => void;
}

export function AddEventDialog({ children, onEventAdd }: AddEventDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();

  const handleSuccess = (event: Omit<Event, 'id'>) => {
    onEventAdd(event);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('addEventDialog.title')}</SheetTitle>
          <SheetDescription>{t('addEventDialog.description')}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow">
            <div className="pr-6">
                <AddEventForm onSuccess={handleSuccess} />
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
