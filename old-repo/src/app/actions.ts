'use server';

import { sendReport, SendReportInput } from '@/ai/flows/send-report-flow';

export async function executeSendReport(input: SendReportInput) {
    return await sendReport(input);
}
