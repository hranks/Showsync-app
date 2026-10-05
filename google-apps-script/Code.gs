/**
 * DJ Ledger - Google Apps Script Backend (Code.gs)
 * Copia este código en el editor de Apps Script de tu Google Sheet (Extensiones > Apps Script)
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎧 DJ Ledger')
    .addItem('📱 Abrir Panel de Control', 'showSidebar')
    .addSeparator()
    .addItem('⚙️ Inicializar Tablas / Hojas', 'setupSpreadsheet')
    .addItem('🔍 Diagnóstico de Conexión', 'checkDiagnostics')
    .addToUi();
}

/**
 * Sirve el archivo Index.html como Web App si se publica de esa forma
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('DJ Ledger - Panel de Control')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Muestra el panel interactivo en la barra lateral (Sidebar) de Google Sheets
 */
function showSidebar() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('DJ Ledger Companion')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Configura la hoja de cálculo con el formato y las columnas correctas de DJ Ledger
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Configurar Hoja de Eventos
  let eventsSheet = ss.getSheetByName('Events');
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet('Events');
  }
  
  const eventHeaders = [
    'ID', 'Title', 'Client Name', 'Venue ID', 'Venue Name', 
    'Date', 'Start Time', 'Duration (Hours)', 'Status', 
    'Fee (USD)', 'Notes', 'Created At'
  ];
  
  eventsSheet.getRange(1, 1, 1, eventHeaders.length).setValues([eventHeaders]);
  eventsSheet.getRange(1, 1, 1, eventHeaders.length)
    .setBackground('#4F46E5')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  eventsSheet.setFrozenRows(1);
  
  // 2. Configurar Hoja de Locales (Venues)
  let venuesSheet = ss.getSheetByName('Venues');
  if (!venuesSheet) {
    venuesSheet = ss.insertSheet('Venues');
  }
  
  const venueHeaders = [
    'ID', 'Name', 'Address', 'Contact Person', 'Phone', 'Email', 
    'Default Fee (USD)', 'Color Theme', 'Created At'
  ];
  
  venuesSheet.getRange(1, 1, 1, venueHeaders.length).setValues([venueHeaders]);
  venuesSheet.getRange(1, 1, 1, venueHeaders.length)
    .setBackground('#06B6D4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  venuesSheet.setFrozenRows(1);
  
  // Insertar un local por defecto si no hay ninguno para facilitar las pruebas
  if (venuesSheet.getLastRow() === 1) {
    const defaultVenueId = 'ven_default1';
    venuesSheet.appendRow([
      defaultVenueId,
      'Club Eclipse Nocturno',
      'Av. de la Música 456, Capital',
      'Carlos Gómez',
      '+54 9 11 5555-1234',
      'carlos@club-eclipse.com',
      350,
      '#4F46E5',
      new Date()
    ]);
  }
  
  // Insertar un evento por defecto si no hay ninguno
  if (eventsSheet.getLastRow() === 1) {
    eventsSheet.appendRow([
      'evt_default1',
      'Fiesta Neon Retro - DJ Set',
      'Sofía Martínez',
      'ven_default1',
      'Club Eclipse Nocturno',
      '2026-10-15',
      '23:00',
      4,
      'confirmed',
      450,
      'Traer setup de luces adicionales y controlador secundario.',
      new Date()
    ]);
  }
  
  return { success: true, message: 'Tablas inicializadas con éxito en tu Google Sheet.' };
}

/**
 * Obtiene de forma consolidada todos los datos (Eventos, Locales e Información general)
 */
function getDJData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    events: [],
    venues: [],
    stats: {
      totalEvents: 0,
      totalEarnings: 0,
      confirmedEvents: 0,
      activeVenues: 0
    }
  };
  
  // Leer Eventos
  const eventsSheet = ss.getSheetByName('Events');
  if (eventsSheet) {
    const lastRow = eventsSheet.getLastRow();
    if (lastRow > 1) {
      const values = eventsSheet.getRange(2, 1, lastRow - 1, 12).getValues();
      data.events = values.map(row => ({
        id: row[0],
        title: row[1],
        clientName: row[2],
        venueId: row[3],
        venueName: row[4],
        date: row[5] ? formatDate(row[5]) : '',
        startTime: row[6],
        duration: row[7],
        status: row[8],
        fee: Number(row[9]) || 0,
        notes: row[10],
        createdAt: row[11]
      })).reverse(); // Ordenar del más reciente al más antiguo
      
      // Calcular métricas
      data.stats.totalEvents = data.events.length;
      data.stats.totalEarnings = data.events.reduce((sum, e) => sum + e.fee, 0);
      data.stats.confirmedEvents = data.events.filter(e => e.status === 'confirmed' || e.status === 'completed').length;
    }
  }
  
  // Leer Locales (Venues)
  const venuesSheet = ss.getSheetByName('Venues');
  if (venuesSheet) {
    const lastRow = venuesSheet.getLastRow();
    if (lastRow > 1) {
      const values = venuesSheet.getRange(2, 1, lastRow - 1, 9).getValues();
      data.venues = values.map(row => ({
        id: row[0],
        name: row[1],
        address: row[2],
        contactPerson: row[3],
        phone: row[4],
        email: row[5],
        defaultFee: Number(row[6]) || 0,
        colorTheme: row[7] || '#06B6D4'
      }));
      data.stats.activeVenues = data.venues.length;
    }
  }
  
  return data;
}

/**
 * Registra un nuevo evento directamente desde el panel
 */
function addEventFromPanel(event) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Events');
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName('Events');
  }
  
  const id = 'evt_' + Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();
  
  const rowData = [
    id,
    event.title,
    event.clientName,
    event.venueId || '',
    event.venueName || '',
    event.date,
    event.startTime,
    Number(event.duration) || 2,
    event.status || 'pending',
    Number(event.fee) || 0,
    event.notes || '',
    timestamp
  ];
  
  sheet.appendRow(rowData);
  return { success: true, eventId: id };
}

/**
 * Registra un nuevo local directamente desde el panel
 */
function addVenueFromPanel(venue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Venues');
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName('Venues');
  }
  
  const id = 'ven_' + Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();
  
  const rowData = [
    id,
    venue.name,
    venue.address || '',
    venue.contactPerson || '',
    venue.phone || '',
    venue.email || '',
    Number(venue.defaultFee) || 0,
    venue.colorTheme || '#06B6D4',
    timestamp
  ];
  
  sheet.appendRow(rowData);
  return { success: true, venueId: id };
}

/**
 * Actualiza el estado de un evento directamente
 */
function updateEventStatusFromPanel(eventId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Events');
  if (!sheet) return { success: false, message: 'La hoja Events no existe.' };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: 'No hay eventos.' };
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === eventId) {
      // Estado se encuentra en la columna 9 (columna I)
      sheet.getRange(i + 2, 9).setValue(newStatus);
      return { success: true };
    }
  }
  return { success: false, message: 'Evento no encontrado.' };
}

/**
 * Elimina un evento de la hoja
 */
function deleteEventFromPanel(eventId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Events');
  if (!sheet) return { success: false, message: 'La hoja Events no existe.' };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: 'No hay eventos.' };
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === eventId) {
      sheet.deleteRow(i + 2);
      return { success: true };
    }
  }
  return { success: false, message: 'Evento no encontrado.' };
}

/**
 * Ejecuta diagnósticos de la hoja
 */
function checkDiagnostics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheets = ss.getSheets().map(s => s.getName());
  
  let report = "🔍 Reporte de Diagnóstico DJ Ledger:\n\n";
  report += `• ID de Hoja: ${ss.getId()}\n`;
  report += `• Hojas Disponibles: ${sheets.join(', ')}\n\n`;
  
  if (sheets.includes('Events')) {
    report += `✅ Tabla 'Events': DETECTADA (${ss.getSheetByName('Events').getLastRow()} filas)\n`;
  } else {
    report += `❌ Tabla 'Events': NO DETECTADA\n`;
  }
  
  if (sheets.includes('Venues')) {
    report += `✅ Tabla 'Venues': DETECTADA (${ss.getSheetByName('Venues').getLastRow()} filas)\n`;
  } else {
    report += `❌ Tabla 'Venues': NO DETECTADA\n`;
  }
  
  ui.alert(report);
  return report;
}

function formatDate(dateObj) {
  if (dateObj instanceof Date) {
    const yyyy = dateObj.getFullYear();
    let mm = dateObj.getMonth() + 1;
    let dd = dateObj.getDate();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(dateObj);
}
