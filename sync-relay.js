const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Uso: node sync-relay.js [ruta-relay]
// Por defecto busca ../Amarea/Relay relativo al sitio.
const RELAY = process.argv[2] || process.env.RELAY_SOURCE || path.join(__dirname, '..', 'Amarea', 'Relay');
const MM_DEST = path.join(__dirname, 'multimedia');
const MUSIC_DEST = path.join(__dirname, 'musica');

const MM_SOURCE_DIRS = ['fotos', 'videos'];
const MUSIC_SOURCE_DIRS = ['Musica'];

const videoExts = new Set(['.mp4', '.webm', '.mov', '.ogv', '.mkv', '.avi']);
const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
const audioExts = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.weba', '.oga']);
const skipFiles = new Set(['desktop.ini', 'Thumbs.db', '.DS_Store']);

function mkdir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function shouldCopy(name, type) {
  if (skipFiles.has(name) || name.startsWith('.')) return false;
  const ext = path.extname(name).toLowerCase();
  if (type === 'media') return videoExts.has(ext) || imageExts.has(ext);
  if (type === 'audio') return audioExts.has(ext);
  return false;
}

function syncDir(source, dest, type) {
  if (!fs.existsSync(source)) { console.warn(`No existe: ${source}`); return; }
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(source, e.name);
    const dst = path.join(dest, e.name);
    if (e.isDirectory()) {
      mkdir(dst);
      syncDir(src, dst, type);
    } else if (shouldCopy(e.name, type)) {
      let copy = true;
      if (fs.existsSync(dst)) {
        const s = fs.statSync(src);
        const d = fs.statSync(dst);
        if (s.size === d.size && s.mtime <= d.mtime) copy = false;
      }
      if (copy) {
        fs.copyFileSync(src, dst);
        console.log(`  ${dst}`);
      }
    }
  }
}

console.log(`Sync desde: ${path.resolve(RELAY)}`);
mkdir(MM_DEST);
mkdir(MUSIC_DEST);

for (const d of MM_SOURCE_DIRS) {
  const s = path.join(RELAY, d);
  if (fs.existsSync(s)) syncDir(s, path.join(MM_DEST, d), 'media');
}

for (const d of MUSIC_SOURCE_DIRS) {
  const s = path.join(RELAY, d);
  if (fs.existsSync(s)) syncDir(s, MUSIC_DEST, 'audio');
}

console.log('Generando manifests...');
execSync('node build-media.js && node build-music.js', { stdio: 'inherit' });
console.log('Sincronización lista.');
