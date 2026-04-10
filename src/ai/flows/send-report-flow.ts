'use server';
/**
 * @fileOverview A flow for sending a report via email.
 *
 * - sendReport - A function that handles sending the report.
 * - SendReportInput - The input type for the sendReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as Brevo from '@getbrevo/brevo';
import { format } from 'date-fns';

const EventSchema = z.object({
    id: z.string(),
    date: z.preprocess((arg) => {
        if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
    }, z.date()),
    startTime: z.string().optional().default(''),
    endTime: z.string().optional().default(''),
    venueName: z.string(),
    eventType: z.enum(['Club', 'Corporate']),
    hours: z.number(),
    overtimeHours: z.number(),
    rate: z.number(),
    totalEarnings: z.number(),
    notes: z.string().optional().default(''),
    paymentAdvanceNIO: z.number().optional(),
    paymentAdvanceUSD: z.number().optional(),
    consumptionsNIO: z.number().optional(),
    consumptionsUSD: z.number().optional(),
});

const ReportSchema = z.object({
  title: z.string(),
  events: z.array(EventSchema).optional(),
});

const SendReportInputSchema = z.object({
  email: z.string().email(),
  report: ReportSchema,
});
export type SendReportInput = z.infer<typeof SendReportInputSchema>;

export async function sendReport(input: SendReportInput): Promise<void> {
  await sendReportFlow(input);
}

const sendReportFlow = ai.defineFlow(
  {
    name: 'sendReportFlow',
    inputSchema: SendReportInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
        const errorMessage = 'The email sending service is not configured. Please add BREVO_API_KEY and BREVO_FROM_EMAIL to your .env file.';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();

    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const formatCurrency = (amount: number, currency: 'USD' | 'NIO') => {
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        }
        return `C$${amount.toFixed(2)}`;
    }

    const eventsHtml = input.report.events?.map(event => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${format(event.date, 'MMM d, yyyy')}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${event.venueName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(event.totalEarnings, 'USD')}</td>
        </tr>
    `).join('') || '<tr><td colspan="3">No events in this report.</td></tr>';
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: input.email }];
    sendSmtpEmail.sender = { email: process.env.BREVO_FROM_EMAIL, name: 'DJ Ledger' };
    sendSmtpEmail.subject = `Your DJ Ledger Report: ${input.report.title}`;
    sendSmtpEmail.htmlContent = `
        <h1>${input.report.title}</h1>
        <p>Here is a summary of the events for this report:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Venue</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Earnings</th>
                </tr>
            </thead>
            <tbody>
                ${eventsHtml}
            </tbody>
        </table>
        <br/>
        <p>Sent from your DJ Ledger application.</p>
    `;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Report sent to ${input.email} via Brevo`);
    } catch (error: any) {
        console.error('Failed to send email via Brevo. Full error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to send the report email. Status: ${error.response?.statusCode}. Body: ${error.response?.body?.message}`);
    }
    return;
  }
);
