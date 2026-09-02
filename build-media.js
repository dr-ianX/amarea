const fs = require('fs');
const path = require('path');

const MEDIA_DIR = process.argv[2] || './multimedia';
const OUT = './multimedia.json';

const videoExts = new Set(['.mp4', '.webm', '.mov', '.ogv', '.mkv', '.avi']);
const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);

function scan(dir) {
  const items = [];
  if (!fs.existsSync(dir)) return items;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative('.', full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      items.push(...scan(full));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (entry.name.startsWith('.') || entry.name === 'desktop.ini' || entry.name === 'Thumbs.db' || entry.name === '.DS_Store') continue;
      if (videoExts.has(ext)) {
        items.push({ path: encodeURI(rel), type: 'video', filename: entry.name });
      } else if (imageExts.has(ext)) {
        items.push({ path: encodeURI(rel), type: 'image', filename: entry.name });
      }
    }
  }
  return items;
}

const items = scan(MEDIA_DIR);
const data = { generatedAt: new Date().toISOString(), count: items.length, items };
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`multimedia.json generado con ${items.length} items.`);
