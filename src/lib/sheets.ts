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

  const rows = events.map(e => {
    let dateStr = '';
    if (e.date) {
      const d = new Date(e.date);
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return [
    e.id,
    dateStr,
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
  ];
  });

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

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }

  if (response.status === 403) {
    const errorDetails = await response.text();
    if (errorDetails.includes('SERVICE_DISABLED') || errorDetails.includes('disabled')) {
      throw new Error('API_NOT_ENABLED');
    }
    throw new Error(`Forbidden: ${errorDetails}`);
  }

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errorDetails}`);
  }

  const data = await response.json();
  return data.spreadsheetId;
}

// Ensure "Eventos" and "Locales" sheets exist in the spreadsheet, creating them if missing
export async function ensureRequiredSheets(accessToken: string, spreadsheetId: string): Promise<void> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${errText}`);
  }

  const metadata = await res.json();
  const sheets = metadata.sheets || [];
  const existingTitles = sheets.map((s: any) => s.properties?.title).filter(Boolean);

  const requests: any[] = [];
  if (!existingTitles.includes('Eventos')) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Eventos',
          gridProperties: { frozenRowCount: 1 }
        }
      }
    });
  }
  if (!existingTitles.includes('Locales')) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Locales',
          gridProperties: { frozenRowCount: 1 }
        }
      }
    });
  }

  if (requests.length > 0) {
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
    
    if (updateRes.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
    }

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to automatically create missing sheets: ${errText}`);
    }
  }
}

// Clear and update Google Sheets with current events and venues
export async function syncDataToSheet(
  accessToken: string,
  spreadsheetId: string,
  events: Event[],
  venues: Venue[]
): Promise<void> {
  await ensureRequiredSheets(accessToken, spreadsheetId);

  const eventData = formatEventsToRows(events);
  const venueData = formatVenuesToRows(venues);

  // 1. Clear existing values to prevent stale data
  const clearEventsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Eventos!A1:Z10000:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (clearEventsRes.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }

  const clearVenuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Locales!A1:Z1000:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (clearVenuesRes.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }

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

  if (writeEventsRes.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }
  if (writeEventsRes.status === 403) {
    const errorDetails = await writeEventsRes.text();
    if (errorDetails.includes('SERVICE_DISABLED') || errorDetails.includes('disabled')) {
      throw new Error('API_NOT_ENABLED');
    }
  }

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

  if (writeVenuesRes.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }
  if (writeVenuesRes.status === 403) {
    const errorDetails = await writeVenuesRes.text();
    if (errorDetails.includes('SERVICE_DISABLED') || errorDetails.includes('disabled')) {
      throw new Error('API_NOT_ENABLED');
    }
  }

  if (!writeVenuesRes.ok) {
    throw new Error('Failed to write venues data to Google Sheets');
  }
}

// Fetch events and venues from Google Sheets to restore database
export async function fetchDataFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ events: Event[]; venues: Venue[] } | null> {
  try {
    await ensureRequiredSheets(accessToken, spreadsheetId);

    // 1. Fetch Eventos
    const eventsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Eventos!A2:O10000`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    if (eventsRes.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
    }
    if (eventsRes.status === 403) {
      const errorDetails = await eventsRes.text();
      if (errorDetails.includes('SERVICE_DISABLED') || errorDetails.includes('disabled')) {
        throw new Error('API_NOT_ENABLED');
      }
    }
    let events: Event[] = [];
    if (eventsRes.ok) {
      const data = await eventsRes.json();
      const rows = data.values || [];
      const parseNumber = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        let str = String(val).trim();
        str = str.replace(/[^\d.,-]/g, '');
        if (str.includes(',') && str.includes('.')) {
          if (str.indexOf(',') < str.indexOf('.')) {
            str = str.replace(/,/g, '');
          } else {
            str = str.replace(/\./g, '').replace(',', '.');
          }
        } else if (str.includes(',')) {
          const parts = str.split(',');
          if (parts[1] && parts[1].length === 3) {
            str = str.replace(/,/g, '');
          } else {
            str = str.replace(',', '.');
          }
        }
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };

      events = rows.map((row: any[]) => {
        let parsedDate = new Date();
        if (row[1]) {
          const dateStr = String(row[1]).trim();
          const standardParsed = new Date(dateStr);
          if (!isNaN(standardParsed.getTime())) {
            parsedDate = standardParsed;
          } else {
            const cleanStr = dateStr.replace(/\s+/g, '');
            const parts = cleanStr.split(/[-/]/);
            if (parts.length === 3) {
              const p0 = parseInt(parts[0], 10);
              const p1 = parseInt(parts[1], 10);
              const p2 = parseInt(parts[2], 10);
              
              if (parts[0].length === 4) {
                parsedDate = new Date(p0, p1 - 1, p2);
              } else if (parts[2].length === 4) {
                if (p0 > 12) {
                  parsedDate = new Date(p2, p1 - 1, p0);
                } else if (p1 > 12) {
                  parsedDate = new Date(p2, p0 - 1, p1);
                } else {
                  parsedDate = new Date(p2, p1 - 1, p0);
                }
              }
            }
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }

        return {
          id: row[0] || crypto.randomUUID(),
          date: parsedDate,
          startTime: row[2] || '',
          endTime: row[3] || '',
          venueName: row[4] || '',
          eventType: (row[5] || 'Club') as any,
          hours: parseNumber(row[6]),
          overtimeHours: parseNumber(row[7]),
          rate: parseNumber(row[8]),
          totalEarnings: parseNumber(row[9]),
          paymentAdvanceNIO: parseNumber(row[10]),
          paymentAdvanceUSD: parseNumber(row[11]),
          consumptionsNIO: parseNumber(row[12]),
          consumptionsUSD: parseNumber(row[13]),
          notes: row[14] || ''
        };
      });
    }

    // 2. Fetch Locales
    const venuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Locales!A2:C1000`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    let venues: Venue[] = [];
    if (venuesRes.ok) {
      const data = await venuesRes.json();
      const rows = data.values || [];
      venues = rows.map((row: any[]) => ({
        id: row[0] || crypto.randomUUID(),
        name: row[1] || '',
        type: (row[2] || 'Club') as any
      }));
    }

    return { events, venues };
  } catch (error) {
    console.error("Error fetching data from sheet:", error);
    return null;
  }
}
