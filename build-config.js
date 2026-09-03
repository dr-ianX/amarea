const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const gasUrl = process.env.AMAREA_GAS_URL || '';
const apiToken = process.env.AMAREA_API_TOKEN || '';
const adminUsername = process.env.AMAREA_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.AMAREA_ADMIN_PASSWORD || '';
const adminHash = adminPassword ? crypto.createHash('sha256').update(adminPassword).digest('hex') : '';
const gaId = process.env.AMAREA_GA_ID || '';
const contactEmail = process.env.AMAREA_CONTACT_EMAIL || '';

const warnings = [];
if (!apiToken) warnings.push('AMAREA_API_TOKEN no está definida. El logging a Google Sheets estará desactivado.');
if (!adminPassword) warnings.push('AMAREA_ADMIN_PASSWORD no está definida. El login de admin estará desactivado.');
if (warnings.length) {
  console.warn('[build-config] Advertencias:');
  warnings.forEach(w => console.warn(' - ' + w));
}

const out = `window.AMAREA_CONFIG = {
  API_TOKEN: ${JSON.stringify(apiToken)},
  GAS_URL: ${JSON.stringify(gasUrl)},
  ADMIN_USERNAME: ${JSON.stringify(adminUsername)},
  ADMIN_HASH: ${JSON.stringify(adminHash)},
  GA_ID: ${JSON.stringify(gaId)},
  CONTACT_EMAIL: ${JSON.stringify(contactEmail)}
};`;

fs.writeFileSync(path.join(__dirname, 'config.js'), out);
console.log('[build-config] config.js generado');
