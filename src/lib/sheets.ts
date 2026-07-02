import type { Event, Venue } from '@/types';

// Helper to format events for writing to Google Sheets
export function formatEventsToRows(events: Event[]): any[][] {
  const headers = [
    'ID',
    'Fecha',
    'Hora Inicio',
    'Hora Fin',
    'Local / Venue',
    'Tipo de Evento',
    'Horas',
    'Horas Extra',
    'Tarifa por Hora',
    'Ganancias Totales (USD)',
    'Adelanto NIO',
    'Adelanto USD',
    'Consumos NIO',
    'Consumos USD',
    'Notas'
  ];

  const rows = events.map(e => [
    e.id,
    e.date ? new Date(e.date).toLocaleDateString() : '',
    e.startTime || '',
    e.endTime || '',
    e.venueName || '',
    e.eventType || '',
    e.hours || 0,
    e.overtimeHours || 0,
    e.rate || 0,
    e.totalEarnings || 0,
    e.paymentAdvanceNIO || 0,
    e.paymentAdvanceUSD || 0,
    e.consumptionsNIO || 0,
    e.consumptionsUSD || 0,
    e.notes || ''
  ]);

  return [headers, ...rows];
}

// Helper to format venues for writing to Google Sheets
export function formatVenuesToRows(venues: Venue[]): any[][] {
  const headers = ['ID', 'Nombre del Local', 'Tipo de Evento por Defecto'];
  
  const rows = venues.map(v => [
    v.id || '',
    v.name || '',
    v.type || ''
  ]);

  return [headers, ...rows];
}

// Create a new spreadsheet with two sheets: Eventos and Locales
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'DJ Ledger - Base de Datos',
      },
      sheets: [
        {
          properties: {
            title: 'Eventos',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Locales',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errorDetails}`);
  }

  const data = await response.json();
  return data.spreadsheetId;
}

// Clear and update Google Sheets with current events and venues
export async function syncDataToSheet(
  accessToken: string,
  spreadsheetId: string,
  events: Event[],
  venues: Venue[]
): Promise<void> {
  const eventData = formatEventsToRows(events);
  const venueData = formatVenuesToRows(venues);

  // 1. Clear existing values to prevent stale data
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Eventos!A1:Z10000:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Locales!A1:Z1000:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  // 2. Write new event values
  const writeEventsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Eventos!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Eventos!A1',
        majorDimension: 'ROWS',
        values: eventData,
      }),
    }
  );

  if (!writeEventsRes.ok) {
    throw new Error('Failed to write events data to Google Sheets');
  }

  // 3. Write new venue values
  const writeVenuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Locales!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Locales!A1',
        majorDimension: 'ROWS',
        values: venueData,
      }),
    }
  );

  if (!writeVenuesRes.ok) {
    throw new Error('Failed to write venues data to Google Sheets');
  }
}
