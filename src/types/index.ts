export type EventType = 'Club' | 'Corporate';

export interface Venue {
  id?: string; // Add id for Firestore
  name: string;
  type: EventType;
}

export interface Event {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  venueName: string;
  eventType: EventType;
  hours: number;
  overtimeHours: number;
  rate: number;
  totalEarnings: number;
  notes: string;
  paymentAdvanceNIO?: number;
  paymentAdvanceUSD?: number;
  consumptionsNIO?: number;
  consumptionsUSD?: number;
}

export interface Settings {
  language: 'en' | 'es';
  reportEmail: string;
  theme: 'light' | 'dark' | 'system';
  username: string;
  notifications: boolean;
  reminderTime: '15' | '60' | '1440';
  exportFrequency: 'weekly' | 'monthly' | 'annually';
  exportMethod: 'email' | 'download' | null;
  cloudBackup: boolean;
}
