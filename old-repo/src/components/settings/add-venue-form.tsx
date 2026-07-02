'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Venue } from '@/types';
import { useTranslation } from '@/hooks/use-translation';

const formSchema = z.object({
  name: z.string().min(1, 'Venue name is required.'),
  type: z.enum(['Club', 'Corporate']),
});

type AddVenueFormValues = z.infer<typeof formSchema>;

interface AddVenueFormProps {
  onSuccess: (venue: Omit<Venue, 'id'>) => void;
}

export function AddVenueForm({ onSuccess }: AddVenueFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<AddVenueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'Club',
    },
  });

  function onSubmit(values: AddVenueFormValues) {
    onSuccess(values);
    toast({
      title: t('addVenueForm.toast.title'),
      description: t('addVenueForm.toast.description', { venueName: values.name }),
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('addVenueForm.venueName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('addVenueForm.venueNamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('addVenueForm.category')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('addVenueForm.categoryPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Club">{t('eventTypes.club')}</SelectItem>
                  <SelectItem value="Corporate">{t('eventTypes.corporate')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit">{t('addVenueForm.addVenue')}</Button>
        </div>
      </form>
    </Form>
  );
}
