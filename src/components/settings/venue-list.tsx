'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2 } from 'lucide-react';
import { AddVenueDialog } from './add-venue-dialog';
import type { Venue, EventType } from '@/types';
import { useTranslation } from '@/hooks/use-translation';
import { useVenues } from '@/hooks/use-venues-store';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useToast } from '@/hooks/use-toast';

export function VenueList() {
  const { venues, addVenue, updateVenue, deleteVenue } = useVenues();
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const { toast } = useToast();
  const isEs = settings.language === 'es';

  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<EventType>('Club');
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);

  const handleAddVenue = (newVenue: Omit<Venue, 'id'>) => {
    addVenue(newVenue);
  };

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue);
    setEditName(venue.name);
    setEditType(venue.type);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue || !editName.trim()) return;
    await updateVenue({
      ...editingVenue,
      name: editName.trim(),
      type: editType,
    });
    toast({
      title: isEs ? 'Lugar actualizado' : 'Venue updated',
      description: isEs
        ? `Se actualizó "${editName.trim()}" correctamente.`
        : `"${editName.trim()}" has been updated.`,
    });
    setEditingVenue(null);
  };

  const handleConfirmDelete = async () => {
    if (!venueToDelete?.id) return;
    await deleteVenue(venueToDelete.id);
    toast({
      title: isEs ? 'Lugar eliminado' : 'Venue deleted',
      description: isEs
        ? `"${venueToDelete.name}" fue eliminado.`
        : `"${venueToDelete.name}" has been deleted.`,
    });
    setVenueToDelete(null);
  };

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
            {venues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                  {isEs ? 'Aún no tienes lugares registrados.' : 'No venues added yet.'}
                </TableCell>
              </TableRow>
            ) : (
              venues.map((venue) => (
                <TableRow key={venue.id || venue.name}>
                  <TableCell className="font-medium">{venue.name}</TableCell>
                  <TableCell>
                    <Badge variant={venue.type === 'Club' ? 'default' : 'secondary'}>
                      {t(`eventTypes.${venue.type.toLowerCase()}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(venue)}
                      title={isEs ? 'Editar lugar' : 'Edit venue'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setVenueToDelete(venue)}
                      title={isEs ? 'Eliminar lugar' : 'Delete venue'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Editar Lugar */}
      <Dialog open={!!editingVenue} onOpenChange={(open) => !open && setEditingVenue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEs ? 'Editar Lugar' : 'Edit Venue'}</DialogTitle>
            <DialogDescription>
              {isEs ? 'Modifica el nombre o categoría del lugar frecuente.' : 'Update the frequent venue name or category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-venue-name">{t('addVenueForm.venueName')}</Label>
              <Input
                id="edit-venue-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-venue-type">{t('addVenueForm.category')}</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as EventType)}>
                <SelectTrigger id="edit-venue-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Club">{t('eventTypes.club')}</SelectItem>
                  <SelectItem value="Corporate">{t('eventTypes.corporate')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingVenue(null)}>
                {isEs ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={!editName.trim()}>
                {isEs ? 'Guardar Cambios' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación de Lugar */}
      <Dialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEs ? 'Eliminar Lugar' : 'Delete Venue'}</DialogTitle>
            <DialogDescription>
              {isEs
                ? `¿Estás seguro de que deseas eliminar "${venueToDelete?.name}" de tus lugares frecuentes?`
                : `Are you sure you want to delete "${venueToDelete?.name}" from your frequent venues?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVenueToDelete(null)}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
              {isEs ? 'Eliminar' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}