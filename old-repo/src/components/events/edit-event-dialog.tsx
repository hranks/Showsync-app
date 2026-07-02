'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EditEventForm } from './edit-event-form';
import type { Event } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/use-translation';

interface EditEventDialogProps {
  event: Event;
  onEventUpdate: (event: Event) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditEventDialog({ event, onEventUpdate, isOpen, onOpenChange }: EditEventDialogProps) {
  const { t } = useTranslation();

  const handleSuccess = (updatedEvent: Event) => {
    onEventUpdate(updatedEvent);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('editEventDialog.title')}</SheetTitle>
          <SheetDescription>{t('editEventDialog.description')}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow">
            <div className="pr-6">
                <EditEventForm event={event} onSuccess={handleSuccess} />
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
