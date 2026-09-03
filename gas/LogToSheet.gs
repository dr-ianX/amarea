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

const COLUMNS = ['timestamp', 'type', 'username', 'id', 'author', 'deviceId', 'text', 'date', 'email', 'role', 'path', 'referrer', 'title', 'artist', 'tab', 'replyTo', 'index', 'extra'];

function getLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Log');
  if (!sheet) {
    sheet = ss.insertSheet('Log');
  }
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  return sheet;
}

function payloadObject(data) {
  if (!data.payload) return {};
  if (typeof data.payload === 'string') {
    try { return JSON.parse(data.payload); } catch (e) { return { value: data.payload }; }
  }
  return data.payload;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function withCors(output) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => output.setHeader(k, v));
  return output;
}

function rawPayload(r) {
  return r.length >= COLUMNS.length ? String(r[COLUMNS.length - 1] || '') : String(r[r.length - 1] || '');
}

function parseFallback(r) {
  try { return JSON.parse(rawPayload(r)); } catch (e) { return {}; }
}

function getField(r, colIndex, fallbackKey) {
  if (r.length > colIndex) {
    const v = r[colIndex];
    if (v !== '' && v != null) return v;
  }
  return parseFallback(r)[fallbackKey] || '';
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
    const payload = payloadObject(data);
    const extra = {};
    Object.keys(payload).forEach(k => extra[k] = payload[k]);

    const row = [timestamp, type, username];
    COLUMNS.slice(3, -1).forEach(k => {
      if (Object.prototype.hasOwnProperty.call(extra, k)) {
        row.push(String(extra[k]));
        delete extra[k];
      } else {
        row.push('');
      }
    });
    const extraStr = JSON.stringify(extra).slice(0, 50000);
    row.push(extraStr);
    sheet.appendRow(row);

    return withCors(ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON));
  } catch (err) {
    return withCors(ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON));
  }
}

function doOptions() {
  return withCors(ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON));
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
      const deviceActions = new Map();
      rows.slice(1).forEach(r => {
        const type = String(r[1]);
        if (type === 'block' || type === 'unblock') {
          const deviceId = getField(r, 5, 'deviceId');
          if (deviceId) deviceActions.set(deviceId, type);
        }
      });
      json = JSON.stringify([...deviceActions.entries()].filter(([, t]) => t === 'block').map(([id]) => id));
    } else if (e.parameter.view === 'chat') {
      const messages = [];
      const deletes = [];
      rows.slice(1).forEach(r => {
        const type = String(r[1]);
        if (type === 'chat') {
          const id = getField(r, 3, 'id');
          if (id) {
            const msg = {
              id,
              author: getField(r, 4, 'author'),
              deviceId: getField(r, 5, 'deviceId'),
              text: getField(r, 6, 'text'),
              date: getField(r, 7, 'date')
            };
            const replyTo = getField(r, 15, 'replyTo');
            if (replyTo) msg.replyTo = replyTo;
            messages.push(msg);
          }
        } else if (type === 'delete_msg') {
          const id = getField(r, 3, 'id');
          if (id) deletes.push(id);
        }
      });
      const byId = new Map();
      messages.forEach(m => { if (!deletes.includes(m.id)) byId.set(m.id, m); });
      const list = [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
      const last = parseInt(e.parameter.last) || 0;
      const limit = e.parameter.admin === '1' ? 1000 : 200;
      const page = last ? list.filter(m => new Date(m.date).getTime() > last).slice(-100) : list.slice(-limit);
      json = JSON.stringify({ messages: page, deletes });
    } else if (e.parameter.view === 'user_roles') {
      const roles = new Map();
      rows.slice(1).forEach(r => {
        const type = String(r[1]);
        if (type === 'register' || type === 'set_role') {
          const role = getField(r, 9, 'role');
          let user = getField(r, 3, 'id');
          if (!user && type === 'register') {
            try {
              const p = JSON.parse(rawPayload(r));
              user = p.username || p.id;
            } catch (e) {}
          }
          if (user && role) roles.set(user, role);
        }
      });
      json = JSON.stringify(Object.fromEntries(roles));
    } else if (e.parameter.view === 'admin') {
      const { users, briefs } = buildAdminData(rows);
      json = JSON.stringify({ users, briefs });
    } else if (e.parameter.view === 'users') {
      json = JSON.stringify(getLatestUsers(rows));
    } else if (e.parameter.view === 'briefs') {
      json = JSON.stringify(getLatestBriefs(rows));
    } else if (e.parameter.view === 'content') {
      const content = {};
      rows.slice(1).reverse().forEach(r => {
        const type = String(r[1]);
        if (type === 'content') {
          const key = getField(r, 6, 'text');
          if (key && !(key in content)) {
            const raw = rawPayload(r);
            try { content[key] = JSON.parse(raw); } catch (e) { content[key] = raw; }
          }
        }
      });
      json = JSON.stringify(content);
    } else {
      json = JSON.stringify(rows);
    }

    const output = callback + '(' + json + ');';
    return withCors(ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT));
  } catch (err) {
    const output = callback + '(' + JSON.stringify({ error: String(err) }) + ');';
    return withCors(ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT));
  }
}

function buildAdminData(rows) {
  const users = getLatestUsers(rows);
  const briefs = getLatestBriefs(rows);
  return { users, briefs };
}

function getLatestUsers(rows) {
  for (let i = rows.length - 1; i > 0; i--) {
    const type = String(rows[i][1] || '');
    if (type === 'users') {
      try {
        const list = JSON.parse(rawPayload(rows[i]));
        if (Array.isArray(list)) return list.map(u => ({
          username: u.username || '',
          password: u.password || '',
          role: u.role || 'invitado',
          email: u.email || '',
          date: u.date || (rows[i][0] ? (rows[i][0].toISOString ? rows[i][0].toISOString() : String(rows[i][0])) : ''),
          permissions: u.permissions || {}
        })).filter(u => u.username);
      } catch (e) {}
    }
  }
  // fallback: reconstruir desde register/set_role
  const usersByName = {};
  const users = [];
  rows.slice(1).forEach(r => {
    const type = String(r[1] || '');
    if (type === 'register' || type === 'set_role') {
      const role = getField(r, 9, 'role') || 'invitado';
      let user = getField(r, 3, 'id');
      if (!user && type === 'register') {
        try { const p = JSON.parse(rawPayload(r)); user = p.username || p.id; } catch (e) {}
      }
      if (user) {
        const ts = r[0] ? (r[0].toISOString ? r[0].toISOString() : String(r[0])) : '';
        const email = getField(r, 8, 'email') || '';
        if (!usersByName[user]) {
          usersByName[user] = { username: user, role, date: ts, email, password: '', permissions: {} };
          users.push(usersByName[user]);
        } else {
          usersByName[user].role = role;
          if (ts) usersByName[user].date = ts;
          if (email) usersByName[user].email = email;
        }
      }
    }
  });
  return users;
}

function getLatestBriefs(rows) {
  const briefs = [];
  const seen = new Set();
  rows.slice(1).forEach(r => {
    if (String(r[1] || '') === 'cuestionario') {
      try {
        const p = JSON.parse(rawPayload(r));
        if (p && p.user && p.answers) {
          const key = (p.user || '') + '|' + (p.date || '');
          if (seen.has(key)) return;
          seen.add(key);
          briefs.push({
            user: p.user,
            date: p.date || (r[0] ? (r[0].toISOString ? r[0].toISOString() : String(r[0])) : ''),
            answers: p.answers
          });
        }
      } catch (e) {}
    }
  });
  return briefs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
