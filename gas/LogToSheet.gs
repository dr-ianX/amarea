// AMAREA — Google Apps Script para logging en Sheets
// Despliega este script como Web App:
//   1. Abre tu hoja de cálculo de Google Sheets.
//   2. Extiensión → Apps Script.
//   3. Pega este código.
//   4. Guarda (Ctrl+S).
//   5. Haz clic en "Implementar" → "Nuevo implementación" → "Aplicación web".
//   6. Ejecutar como: tu cuenta. Acceder: Cualquiera, incluso anónimo.
//   7. Copia la URL de la aplicación web y pégala en el input de /privado.html.

function doPost(e) {
  try {
    const body = e.postData.contents;
    const data = body ? JSON.parse(body) : {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Log');
    if (!sheet) {
      sheet = ss.insertSheet('Log');
      sheet.appendRow(['timestamp', 'type', 'username', 'payload']);
    }

    const timestamp = new Date();
    const type = String(data.type || '');
    const username = String(data.username || 'guest');
    let payload = '';
    if (data.payload) {
      payload = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
      // Celda de Sheets soporta 50,000 caracteres.
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Log') || ss.getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    const json = JSON.stringify(rows);
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
