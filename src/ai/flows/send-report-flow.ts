import { Event } from "@/types";

export interface SendReportInput {
  email: string;
  report: {
    title: string;
    events?: Event[];
  };
}

export async function sendReport(input: SendReportInput): Promise<void> {
  const response = await fetch('/api/send-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to send report');
  }
}
