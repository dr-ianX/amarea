// AMAREA — Google Apps Script para logging en Sheets
// Despliega este script como Web App:
//   1. Abre tu hoja de cálculo de Google Sheets.
//   2. Extiensión → Apps Script.
//   3. Pega este código.
//   4. Guarda (Ctrl+S).
//   5. Haz clic en "Implementar" → "Nuevo implementación" → "Aplicación web".
//   6. Ejecutar como: tu cuenta. Acceder: Cualquiera, incluso anónimo.
//   7. Copia la URL de la aplicación web y pégala en el input de /privado.html.

function getToken() {
  const t = PropertiesService.getScriptProperties().getProperty('AMAREA_TOKEN');
  if (!t) throw new Error('AMAREA_TOKEN not configured in script properties');
  return t;
}

function validateToken(e, body) {
  const data = body || e.parameter || {};
  if (data.token !== getToken()) throw new Error('Forbidden');
}

const COLUMNS = ['timestamp', 'type', 'username', 'message', 'payload'];

function getLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Log');
  if (!sheet) {
    sheet = ss.insertSheet('Log');
  }
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  return sheet;
}

function extractMessage(type, payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (type === 'chat' && payload.text) return payload.text;
  if (type === 'delete_msg' && payload.id) return 'borrar: ' + payload.id;
  if (type === 'join' && payload.email) return payload.email;
  if (type === 'track_select') return (payload.title || '') + (payload.artist ? ' - ' + payload.artist : '');
  if (type === 'tab' && payload.tab) return payload.tab;
  if (type === 'pageview' && payload.path) return payload.path;
  if (type === 'login' && payload.username) return payload.username;
  if (type === 'register' && payload.username) return payload.username;
  if (type === 'block' && payload.deviceId) return 'bloquear: ' + payload.deviceId;
  return JSON.stringify(payload).slice(0, 500);
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
    const body = e.postData ? e.postData.contents : '{}';
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

    const message = extractMessage(type, data.payload);
    sheet.appendRow([timestamp, type, username, message, payload]);

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
            const p = JSON.parse(String(r[4] || r[3]));
            if (p.deviceId) blocked.add(p.deviceId);
          } catch (x) { /* skip malformed */ }
        }
      });
      json = JSON.stringify([...blocked]);
    } else if (e.parameter.view === 'chat') {
      const messages = [];
      const deletes = [];
      rows.slice(1).forEach(r => {
        const type = String(r[1]);
        const raw = String(r[4] || r[3] || '');
        if (type === 'chat') {
          try {
            const p = JSON.parse(raw);
            if (p && p.id) messages.push(p);
          } catch (x) { /* skip malformed */ }
        } else if (type === 'delete_msg') {
          try {
            const p = JSON.parse(raw);
            if (p && p.id) deletes.push(p.id);
          } catch (x) { /* skip malformed */ }
        }
      });
      const byId = new Map();
      messages.forEach(m => { if (!deletes.includes(m.id)) byId.set(m.id, m); });
      const list = [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
      const last = parseInt(e.parameter.last) || 0;
      const page = last ? list.filter(m => new Date(m.date).getTime() > last).slice(-100) : list.slice(-200);
      json = JSON.stringify({ messages: page, deletes });
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
