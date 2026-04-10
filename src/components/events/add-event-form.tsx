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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import React from 'react';
import type { Event, Venue } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useVenues } from '@/hooks/use-venues-store';

const formSchema = z.object({
  venueName: z.string().min(1, 'Venue name is required.'),
  isPredefinedVenue: z.boolean().default(false),
  eventType: z.enum(['Club', 'Corporate']),
  date: z.date({ required_error: 'Date is required.' }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalEarnings: z.coerce.number().min(0),
  notes: z.string().optional(),
  paymentAdvanceNIO: z.coerce.number().optional(),
  paymentAdvanceUSD: z.coerce.number().optional(),
  consumptionsNIO: z.coerce.number().optional(),
  consumptionsUSD: z.coerce.number().optional(),
});

type AddEventFormValues = z.infer<typeof formSchema>;

interface AddEventFormProps {
  onSuccess: (event: Omit<Event, 'id'>) => void;
}

export function AddEventForm({ onSuccess }: AddEventFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { venues } = useVenues();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const form = useForm<AddEventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined,
      startTime: '',
      endTime: '',
      totalEarnings: 0,
      eventType: 'Club',
      venueName: '',
      notes: '',
      paymentAdvanceNIO: 0,
      paymentAdvanceUSD: 0,
      consumptionsNIO: 0,
      consumptionsUSD: 0,
    },
  });
  
  const [selectedVenue, setSelectedVenue] = React.useState<Venue | null>(null);

  const handleVenueChange = (venueName: string) => {
    const venue = venues.find(v => v.name === venueName);
    if (venue && venue.name !== 'Other') {
      setSelectedVenue(venue);
      form.setValue('venueName', venue.name);
      form.setValue('eventType', venue.type);
      form.setValue('isPredefinedVenue', true);
    } else {
      setSelectedVenue(null);
      form.setValue('isPredefinedVenue', false);
      form.setValue('venueName', venueName === 'Other' ? '' : venueName);
      form.setValue('totalEarnings', 0);
    }
  }

  function onSubmit(values: AddEventFormValues) {
    let totalHours = 0;
    let overtimeHours = 0;
    
    if (values.startTime && values.endTime && values.date) {
      const startDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.startTime}`);
      let endDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.endTime}`);

      // If end time is on the next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const diffMs = endDateTime.getTime() - startDateTime.getTime();
      totalHours = diffMs / (1000 * 60 * 60);
    }

    const rate = totalHours > 0 ? values.totalEarnings / totalHours : 0;
    
    onSuccess({ 
      ...values,
      notes: values.notes || '',
      paymentAdvanceNIO: values.paymentAdvanceNIO || 0,
      paymentAdvanceUSD: values.paymentAdvanceUSD || 0,
      consumptionsNIO: values.consumptionsNIO || 0,
      consumptionsUSD: values.consumptionsUSD || 0,
      date: values.date || new Date(),
      startTime: values.startTime || '',
      endTime: values.endTime || '',
      hours: totalHours, 
      overtimeHours, 
      rate,
      totalEarnings: values.totalEarnings
    });
    
    toast({
      title: t('addEventForm.toast.title'),
      description: t('addEventForm.toast.description', { venueName: values.venueName, date: values.date ? format(values.date, 'PPP') : '' }),
    })
    form.reset();
  }

  const TimePicker = ({ fieldName }: { fieldName: 'startTime' | 'endTime' }) => {
    const timeValue = form.watch(fieldName);
    const [hour, minute, period] = React.useMemo(() => {
        if (!timeValue) return ['08', '00', 'PM'];
        const [h, m] = timeValue.split(':');
        const hour24 = parseInt(h, 10);
        const newPeriod = hour24 >= 12 ? 'PM' : 'AM';
        const newHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
        return [String(newHour).padStart(2, '0'), m, newPeriod];
    }, [timeValue]);

    const setTime = (h?: string, m?: string, p?: string) => {
        const currentHour = h || hour;
        const currentMinute = m || minute;
        const currentPeriod = p || period;
        
        let hour24 = parseInt(currentHour, 10);
        if (currentPeriod === 'PM' && hour24 < 12) {
            hour24 += 12;
        } else if (currentPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        const newTime = `${String(hour24).padStart(2, '0')}:${currentMinute}`;
        form.setValue(fieldName, newTime, { shouldValidate: true, shouldDirty: true });
    };

    return (
      <div className="grid grid-cols-3 gap-2">
        <Select value={hour} onValueChange={(h) => setTime(h, undefined, undefined)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={minute} onValueChange={(m) => setTime(undefined, m, undefined)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['00', '15', '30', '45'].map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(p) => setTime(undefined, undefined, p)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
};

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
        <FormItem>
           <FormLabel>{t('addEventForm.venue')}</FormLabel>
           <Select onValueChange={handleVenueChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('addEventForm.selectVenue')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {venues.map(venue => (
                <SelectItem key={venue.id || venue.name} value={venue.name}>{venue.name}</SelectItem>
              ))}
              <SelectItem value="Other">{t('addEventForm.otherVenue')}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage>{form.formState.errors.venueName?.message}</FormMessage>
        </FormItem>

        {(!selectedVenue || form.getValues('venueName') === '') && (
          <>
            <FormField
              control={form.control}
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addEventForm.venueName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('addEventForm.venueNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addEventForm.eventType')}</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('addEventForm.eventTypePlaceholder')} />
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
          </>
        )}
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('addEventForm.date')}</FormLabel>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>{t('addEventForm.pickDate')}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
            <FormField
            control={form.control}
            name="startTime"
            render={() => (
                <FormItem>
                <FormLabel>{t('addEventForm.startTime')}</FormLabel>
                <TimePicker fieldName="startTime" />
                <FormMessage>{form.formState.errors.startTime?.message}</FormMessage>
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="endTime"
            render={() => (
                <FormItem>
                <FormLabel>{t('addEventForm.endTime')}</FormLabel>
                <TimePicker fieldName="endTime" />
                <FormMessage>{form.formState.errors.endTime?.message}</FormMessage>
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={form.control}
            name="totalEarnings"
            render={({ field }) => (
            <FormItem>
                <FormLabel>{t('editEventForm.earnings')}</FormLabel>
                <FormControl>
                <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="paymentAdvanceNIO"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('addEventForm.advanceNIO')}</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="paymentAdvanceUSD"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('addEventForm.advanceUSD')}</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="consumptionsNIO"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('addEventForm.consumptionsNIO')}</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="consumptionsUSD"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('addEventForm.consumptionsUSD')}</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('addEventForm.notes')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('addEventForm.notesPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg">{t('addEventForm.logEvent')}</Button>
      </form>
    </Form>
  );
}
