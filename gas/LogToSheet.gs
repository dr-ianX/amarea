// AMAREA — Google Apps Script para logging en Sheets
// Despliega este script como Web App:
//   1. Abre tu hoja de cálculo de Google Sheets.
//   2. Extiensión → Apps Script.
//   3. Pega este código.
//   4. Guarda (Ctrl+S).
//   5. Haz clic en "Implementar" → "Nuevo implementación" → "Aplicación web".
//   6. Ejecutar como: tu cuenta. Acceder: Cualquiera, incluso anónimo.
//   7. Copia la URL de la aplicación web y pégala en el input de /privado.html.

const TOKEN = 'amarea-token-2026-v1';

function validateToken(e, body) {
  const data = body || e.parameter || {};
  if (data.token !== TOKEN) throw new Error('Forbidden');
}

function getLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Log');
  if (!sheet) {
    sheet = ss.insertSheet('Log');
    sheet.appendRow(['timestamp', 'type', 'username', 'payload']);
  }
  return sheet;
}

function pruneLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Log');
  if (!sheet) return 0;
  const now = new Date();
  const days90 = 90 * 24 * 60 * 60 * 1000;
  const rows = sheet.getDataRange().getValues();
  let removed = 0;
  // Desde abajo hacia arriba para no alterar índices
  for (let i = rows.length - 1; i > 0; i--) {
    const ts = new Date(rows[i][0]);
    if (now - ts > days90) {
      sheet.deleteRow(i + 1);
      removed++;
    }
  }
  return removed;
}

function doPost(e) {
  try {
    const body = e.postData.contents;
    const data = body ? JSON.parse(body) : {};
    validateToken(e, data);

    const sheet = getLogSheet();
    const timestamp = new Date();
    const type = String(data.type || '');
    const username = String(data.username || 'guest');
    let payload = '';
    if (data.payload) {
      payload = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
      if (payload.length > 50000) payload = payload.slice(0, 50000);
    }

    sheet.appendRow([timestamp, type, username, payload]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const callback = e.parameter.callback || 'amareaCallback';
  try {
    validateToken(e);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Log') || ss.getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    let json;

    if (e.parameter.action === 'prune') {
      const removed = pruneLog();
      json = JSON.stringify({ result: 'ok', removed });
    } else if (e.parameter.view === 'blocks') {
      const blocked = new Set();
      rows.slice(1).forEach(r => {
        if (String(r[1]) === 'block') {
          try {
            const p = JSON.parse(String(r[3]));
            if (p.deviceId) blocked.add(p.deviceId);
          } catch (x) { /* skip malformed */ }
        }
      });
      json = JSON.stringify([...blocked]);
    } else {
      json = JSON.stringify(rows);
    }

    const output = callback + '(' + json + ');';
    return ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    const output = callback + '(' + JSON.stringify({ error: String(err) }) + ');';
    return ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}
