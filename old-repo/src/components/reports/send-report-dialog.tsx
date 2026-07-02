'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types';
import { sendReport } from '@/ai/flows/send-report-flow';
import { Loader2, Send } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useSettingsStore } from '@/hooks/use-settings-store';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type SendReportFormValues = z.infer<typeof formSchema>;

interface SendReportDialogProps {
  events: Event[];
  reportTitle: string;
}

export function SendReportDialog({ events, reportTitle }: SendReportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings } = useSettingsStore();

  const form = useForm<SendReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        email: settings.reportEmail || '',
    },
  });

  React.useEffect(() => {
    if (settings.reportEmail) {
        form.setValue('email', settings.reportEmail);
    }
  }, [settings.reportEmail, form]);

  const onSubmit = async (values: SendReportFormValues) => {
    setIsSending(true);
    try {
      await sendReport({
        email: values.email,
        report: {
          title: reportTitle,
          events: events,
        },
      });
      toast({
        title: t('sendReportDialog.toast.success.title'),
        description: t('sendReportDialog.toast.success.description', { email: values.email }),
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to send report:', error);
      toast({
        title: t('sendReportDialog.toast.error.title'),
        description: t('sendReportDialog.toast.error.description'),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send className="mr-2 h-4 w-4" />
          {t('sendReportDialog.buttonText')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sendReportDialog.title')}</DialogTitle>
          <DialogDescription>{t('sendReportDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <Label htmlFor="email">{t('sendReportDialog.emailLabel')}</Label>
                    <FormControl>
                        <Input
                            id="email"
                            placeholder="you@example.com"
                            {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isSending}>
                    {isSending ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('sendReportDialog.sending')}
                        </>
                    ) : (
                        t('sendReportDialog.send')
                    )}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
