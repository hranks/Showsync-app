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

// Create a new spreadsheet with two sheets: Events and Venues
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
            title: 'Events',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Venues',
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

// Ensure "Events" and "Venues" sheets exist in the spreadsheet, creating them if missing,
// and delete any conflicting legacy "Eventos" and "Locales" sheets.
export async function ensureRequiredSheets(accessToken: string, spreadsheetId: string): Promise<void> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
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
  const sheets: any[] = metadata.sheets || [];
  const existingTitles = sheets.map((s: any) => s.properties?.title).filter(Boolean);

  const addRequests: any[] = [];
  if (!existingTitles.includes('Events')) {
    addRequests.push({
      addSheet: {
        properties: {
          title: 'Events',
          gridProperties: { frozenRowCount: 1 }
        }
      }
    });
  }
  if (!existingTitles.includes('Venues')) {
    addRequests.push({
      addSheet: {
        properties: {
          title: 'Venues',
          gridProperties: { frozenRowCount: 1 }
        }
      }
    });
  }

  // Execute add requests first if needed
  if (addRequests.length > 0) {
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: addRequests })
    });
    
    if (updateRes.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
    }

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to create missing sheets: ${errText}`);
    }
  }

  // Delete legacy conflicting sheets ("Eventos" and "Locales") if present
  const deleteRequests: any[] = [];
  for (const s of sheets) {
    const title = s.properties?.title;
    const sheetId = s.properties?.sheetId;
    if ((title === 'Eventos' || title === 'Locales') && sheetId !== undefined) {
      deleteRequests.push({
        deleteSheet: { sheetId }
      });
    }
  }

  if (deleteRequests.length > 0) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: deleteRequests })
      });
      console.log('Removed conflicting legacy sheets "Eventos" and "Locales" from spreadsheet.');
    } catch (e) {
      console.warn('Could not remove legacy sheets:', e);
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
  const clearEventsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Events!A1:Z10000:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (clearEventsRes.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }

  const clearVenuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Venues!A1:Z1000:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (clearVenuesRes.status === 401) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
  }

  // 2. Write new event values
  const writeEventsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Events!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Events!A1',
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Venues!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Venues!A1',
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
    // 1. Check existing sheets
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (metaRes.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
    }
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Failed to fetch spreadsheet metadata: ${errText}`);
    }

    const metadata = await metaRes.json();
    const sheets: any[] = metadata.sheets || [];
    const titles = sheets.map(s => s.properties?.title).filter(Boolean);

    // Find the sheet to use for Events: prefer 'Events', fallback to 'Eventos' if only 'Eventos' exists
    const eventsSheet = titles.includes('Events') ? 'Events' : (titles.includes('Eventos') ? 'Eventos' : null);
    // Find the sheet to use for Venues: prefer 'Venues', fallback to 'Locales' if only 'Locales' exists
    const venuesSheet = titles.includes('Venues') ? 'Venues' : (titles.includes('Locales') ? 'Locales' : null);

    if (!eventsSheet && !venuesSheet) {
      // Nothing to read, ensure required sheets
      await ensureRequiredSheets(accessToken, spreadsheetId);
      return { events: [], venues: [] };
    }

    const parseNumber = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      let str = String(val).trim();
      
      // Handle time duration format like "4:30" or "04:30:00"
      if (str.includes(':')) {
        const parts = str.split(':');
        const hh = parseInt(parts[0], 10) || 0;
        const mm = parseInt(parts[1], 10) || 0;
        const ss = parts[2] ? parseInt(parts[2], 10) || 0 : 0;
        return hh + mm / 60 + ss / 3600;
      }

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

    const parseDateValue = (raw: any): Date => {
      if (!raw) {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
      }
      if (raw instanceof Date) {
        return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate(), 12, 0, 0);
      }
      // Check for Google Sheets serial date number (e.g. 45580)
      if (typeof raw === 'number' || (!isNaN(Number(raw)) && Number(raw) > 30000 && Number(raw) < 70000)) {
        const serial = Number(raw);
        const utcDays = Math.floor(serial - 25569);
        const dateObj = new Date(utcDays * 86400 * 1000);
        return new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 12, 0, 0);
      }

      const str = String(raw).trim();
      const datePart = str.split('T')[0].trim();
      
      // Match YYYY-MM-DD or YYYY/MM/DD
      const ymdMatch = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (ymdMatch) {
        const y = parseInt(ymdMatch[1], 10);
        const m = parseInt(ymdMatch[2], 10);
        const d = parseInt(ymdMatch[3], 10);
        return new Date(y, m - 1, d, 12, 0, 0);
      }

      // Match DD/MM/YYYY or MM/DD/YYYY
      const dmyMatch = datePart.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (dmyMatch) {
        const p1 = parseInt(dmyMatch[1], 10);
        const p2 = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        // If p1 > 12, it's definitely DD/MM/YYYY
        if (p1 > 12) {
          return new Date(y, p2 - 1, p1, 12, 0, 0);
        }
        // If p2 > 12, it's definitely MM/DD/YYYY
        if (p2 > 12) {
          return new Date(y, p1 - 1, p2, 12, 0, 0);
        }
        // Default to DD/MM/YYYY
        return new Date(y, p2 - 1, p1, 12, 0, 0);
      }

      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
      }

      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    };

    let events: Event[] = [];
    if (eventsSheet) {
      const eventsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(eventsSheet)}!A1:Z10000`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (eventsRes.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        const allRows: any[][] = data.values || [];
        if (allRows.length > 0) {
          const headerRow = allRows[0].map(h => String(h || '').trim().toLowerCase());
          
          const findCol = (patterns: (string | RegExp)[], defIdx: number): number => {
            for (let i = 0; i < headerRow.length; i++) {
              const h = headerRow[i];
              for (const p of patterns) {
                if (typeof p === 'string' ? h.includes(p) : p.test(h)) return i;
              }
            }
            return defIdx;
          };

          // Detect column indices based on header names
          const colId = findCol([/^id$/i], 0);
          const colDate = findCol(['fecha', 'date'], 1);
          const colStartTime = findCol(['hora inicio', 'start time', 'hora', 'start'], 2);
          const colEndTime = findCol(['hora fin', 'end time', 'end', 'fin', 'duration', 'duración', 'duracion'], 3);
          const colVenue = findCol(['local / venue', 'venue name', 'venue', 'local'], 4);
          const colType = findCol(['tipo de evento', 'event type', 'tipo', 'type', 'status'], 5);
          const colHours = findCol([/^horas?$/i, /^hours?$/i], 6);
          const colOvertime = findCol(['horas extra', 'overtime', 'extra'], 7);
          const colRate = findCol(['tarifa por hora', 'tarifa', 'rate'], 8);
          const colEarnings = findCol(['ganancias totales', 'ganancias', 'fee (usd)', 'fee', 'total earnings', 'earnings', 'total'], 9);
          const colAdvNIO = findCol(['adelanto nio', 'advance nio'], 10);
          const colAdvUSD = findCol(['adelanto usd', 'advance usd'], 11);
          const colConsNIO = findCol(['consumos nio', 'consumo nio', 'consumptions nio'], 12);
          const colConsUSD = findCol(['consumos usd', 'consumo usd', 'consumptions usd'], 13);
          const colNotes = findCol(['notas', 'notes', 'nota', 'note'], 14);

          // Additional Code.gs specific headers
          const colTitle = findCol(['title', 'título', 'titulo'], -1);
          const colClient = findCol(['client name', 'cliente', 'client'], -1);

          const dataRows = allRows.slice(1);
          events = dataRows.map((row: any[]) => {
            const parsedDate = parseDateValue(row[colDate]);
            const startTime = String(row[colStartTime] || '').trim();
            let endTime = String(row[colEndTime] || '').trim();
            const venueName = String(row[colVenue] || '').trim();
            
            const rawType = String(row[colType] || 'Club').trim();
            const eventType: 'Club' | 'Corporate' = rawType.toLowerCase().includes('corp') ? 'Corporate' : 'Club';

            let hours = parseNumber(row[colHours]);
            // If hours is 0 but colEndTime contains a numeric duration
            if (hours === 0 && !isNaN(parseFloat(endTime)) && !endTime.includes(':')) {
              hours = parseFloat(endTime);
              endTime = '';
            }

            const overtimeHours = parseNumber(row[colOvertime]);
            const rate = parseNumber(row[colRate]);
            const totalEarnings = parseNumber(row[colEarnings]);
            const paymentAdvanceNIO = parseNumber(row[colAdvNIO]);
            const paymentAdvanceUSD = parseNumber(row[colAdvUSD]);
            const consumptionsNIO = parseNumber(row[colConsNIO]);
            const consumptionsUSD = parseNumber(row[colConsUSD]);
            
            let notes = String(row[colNotes] || '').trim();
            // If Code.gs format has title and clientName, include them in notes if not present
            if (colTitle !== -1 && row[colTitle]) {
              const titleVal = String(row[colTitle]).trim();
              if (titleVal && !notes.includes(titleVal)) {
                notes = titleVal + (notes ? ` - ${notes}` : '');
              }
            }
            if (colClient !== -1 && row[colClient]) {
              const clientVal = String(row[colClient]).trim();
              if (clientVal && !notes.includes(clientVal)) {
                notes = (notes ? `${notes} (Cliente: ${clientVal})` : `Cliente: ${clientVal}`);
              }
            }

            return {
              id: row[colId] || crypto.randomUUID(),
              date: parsedDate,
              startTime,
              endTime,
              venueName,
              eventType,
              hours,
              overtimeHours,
              rate,
              totalEarnings,
              paymentAdvanceNIO,
              paymentAdvanceUSD,
              consumptionsNIO,
              consumptionsUSD,
              notes
            };
          });
        }
      }
    }

    let venues: Venue[] = [];
    if (venuesSheet) {
      const venuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(venuesSheet)}!A1:Z1000`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (venuesRes.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED_TOKEN');
      if (venuesRes.ok) {
        const data = await venuesRes.json();
        const allRows: any[][] = data.values || [];
        if (allRows.length > 0) {
          const headerRow = allRows[0].map(h => String(h || '').trim().toLowerCase());
          const findCol = (patterns: (string | RegExp)[], defIdx: number): number => {
            for (let i = 0; i < headerRow.length; i++) {
              const h = headerRow[i];
              for (const p of patterns) {
                if (typeof p === 'string' ? h.includes(p) : p.test(h)) return i;
              }
            }
            return defIdx;
          };

          const colId = findCol([/^id$/i], 0);
          const colName = findCol(['nombre del local', 'nombre', 'name', 'local'], 1);
          const colType = findCol(['tipo de evento por defecto', 'tipo', 'type'], 2);

          const dataRows = allRows.slice(1);
          venues = dataRows
            .filter(r => r && r[colName] && String(r[colName]).trim())
            .map((row: any[]) => ({
              id: row[colId] || crypto.randomUUID(),
              name: String(row[colName] || '').trim(),
              type: (String(row[colType] || '').toLowerCase().includes('corp') ? 'Corporate' : 'Club') as any
            }));
        }
      }
    }

    // Ensure standard 'Events' and 'Venues' exist and cleanup any legacy 'Eventos'/'Locales' sheets
    await ensureRequiredSheets(accessToken, spreadsheetId);

    return { events, venues };
  } catch (error) {
    console.error("Error fetching data from sheet:", error);
    return null;
  }
}
