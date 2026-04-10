'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddVenueForm } from './add-venue-form';
import type { Venue } from '@/types';
import { useTranslation } from '@/hooks/use-translation';

interface AddVenueDialogProps {
  onVenueAdd: (venue: Omit<Venue, 'id'>) => void;
}

export function AddVenueDialog({ onVenueAdd }: AddVenueDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();

  const handleSuccess = (venue: Omit<Venue, 'id'>) => {
    onVenueAdd(venue);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('addVenueDialog.buttonText')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addVenueDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('addVenueDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <AddVenueForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
