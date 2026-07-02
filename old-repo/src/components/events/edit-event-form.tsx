
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
import type { Event } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

const formSchema = z.object({
  venueName: z.string().min(1, 'Venue name is required.'),
  eventType: z.enum(['Club', 'Corporate']),
  date: z.date({ required_error: 'Date is required.' }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalEarnings: z.coerce.number().min(0, "Earnings must be a positive number."),
  notes: z.string().optional(),
  paymentAdvanceNIO: z.coerce.number().optional(),
  paymentAdvanceUSD: z.coerce.number().optional(),
  consumptionsNIO: z.coerce.number().optional(),
  consumptionsUSD: z.coerce.number().optional(),
});

type EditEventFormValues = z.infer<typeof formSchema>;

interface EditEventFormProps {
  event: Event;
  onSuccess: (event: Event) => void;
}

export function EditEventForm({ event, onSuccess }: EditEventFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const form = useForm<EditEventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...event,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      totalEarnings: event.totalEarnings || 0,
      notes: event.notes || '',
      paymentAdvanceNIO: event.paymentAdvanceNIO || 0,
      paymentAdvanceUSD: event.paymentAdvanceUSD || 0,
      consumptionsNIO: event.consumptionsNIO || 0,
      consumptionsUSD: event.consumptionsUSD || 0,
    },
  });

  function onSubmit(values: EditEventFormValues) {
    let totalHours = 0;
    let overtimeHours = 0;

    const startTime = values.startTime || '';
    const endTime = values.endTime || '';

    if (startTime && endTime) {
      const startDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${startTime}`);
      let endDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${endTime}`);

      // If end time is on the next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const diffMs = endDateTime.getTime() - startDateTime.getTime();
      totalHours = diffMs / (1000 * 60 * 60);
    }
    
    const rate = totalHours > 0 ? values.totalEarnings / totalHours : 0;
    
    onSuccess({ 
      ...event,
      ...values,
      notes: values.notes || '',
      paymentAdvanceNIO: values.paymentAdvanceNIO || 0,
      paymentAdvanceUSD: values.paymentAdvanceUSD || 0,
      consumptionsNIO: values.consumptionsNIO || 0,
      consumptionsUSD: values.consumptionsUSD || 0,
      startTime,
      endTime,
      hours: totalHours, 
      overtimeHours, 
      rate,
    });
    
    toast({
      title: t('editEventForm.toast.title'),
      description: t('editEventForm.toast.description', { venueName: values.venueName, date: format(values.date, 'PPP') }),
    })
  }
  
  const TimePicker = ({ fieldName }: { fieldName: 'startTime' | 'endTime' }) => {
    const timeValue = form.watch(fieldName);
    
    const [currentHour, currentMinute, currentPeriod] = React.useMemo(() => {
        if (!timeValue) return ['08', '00', 'PM'];
        const [h, m] = timeValue.split(':');
        const hour24 = parseInt(h, 10);
        const newPeriod = hour24 >= 12 ? 'PM' : 'AM';
        const newHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
        return [String(newHour).padStart(2, '0'), m, newPeriod];
    }, [timeValue]);

    const setTime = (part: 'hour' | 'minute' | 'period', value: string) => {
        let hour = currentHour;
        let minute = currentMinute;
        let period = currentPeriod;

        if (part === 'hour') hour = value;
        if (part === 'minute') minute = value;
        if (part === 'period') period = value;

        if (!hour || !minute || !period) {
            form.setValue(fieldName, '', { shouldValidate: true, shouldDirty: true });
            return;
        }
        
        let hour24 = parseInt(hour, 10);
        if (period === 'PM' && hour24 < 12) {
            hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        const newTime = `${String(hour24).padStart(2, '0')}:${minute}`;
        form.setValue(fieldName, newTime, { shouldValidate: true, shouldDirty: true });
    };

    return (
      <div className="grid grid-cols-3 gap-2">
        <Select value={currentHour} onValueChange={(h) => setTime('hour', h)}>
          <SelectTrigger>
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentMinute} onValueChange={(m) => setTime('minute', m)}>
          <SelectTrigger>
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            {['00', '15', '30', '45'].map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentPeriod} onValueChange={(p) => setTime('period', p)}>
          <SelectTrigger>
            <SelectValue placeholder="--" />
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
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('addEventForm.date')}</FormLabel>
              <Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                <Input type="number" {...field} />
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
                    <Input type="number" {...field} value={field.value || ''} />
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
                    <Input type="number" {...field} value={field.value || ''} />
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
                    <Input type="number" {...field} value={field.value || ''} />
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
                    <Input type="number" {...field} value={field.value || ''} />
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
                <Textarea placeholder={t('addEventForm.notesPlaceholder')} {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg">{t('editEventForm.save')}</Button>
      </form>
    </Form>
  );
}
