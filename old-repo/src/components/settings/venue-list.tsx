'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { AddVenueDialog } from './add-venue-dialog';
import type { Venue } from '@/types';
import { useTranslation } from '@/hooks/use-translation';
import { useVenues } from '@/hooks/use-venues-store';

export function VenueList() {
  const { venues, addVenue, deleteVenue } = useVenues();
  const { t } = useTranslation();

  const handleAddVenue = (newVenue: Omit<Venue, 'id'>) => {
    addVenue(newVenue);
  };
  
  const handleDeleteVenue = (venueId?: string) => {
    if (venueId && window.confirm('Are you sure you want to delete this venue?')) {
        deleteVenue(venueId);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddVenueDialog onVenueAdd={handleAddVenue} />
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('venueList.venueName')}</TableHead>
              <TableHead>{t('venueList.category')}</TableHead>
              <TableHead className="text-right">{t('venueList.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow key={venue.id}>
                <TableCell className="font-medium">{venue.name}</TableCell>
                <TableCell>
                  <Badge variant={venue.type === 'Club' ? 'default' : 'secondary'}>
                    {t(`eventTypes.${venue.type.toLowerCase()}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" disabled>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteVenue(venue.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    