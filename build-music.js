const fs = require('fs');
const path = require('path');

const MUSIC_DIR = process.argv[2] || './musica';
const OUT = path.join(MUSIC_DIR, 'tracks.json');

const audioExts = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.weba', '.oga']);

function scan(dir, base) {
  const tracks = [];
  if (!fs.existsSync(dir)) return tracks;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      tracks.push(...scan(full, base));
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (audioExts.has(ext)) {
        const rel = path.relative(base, full).replace(/\\/g, '/');
        const parts = rel.split('/');
        const artist = parts.length > 1 ? parts.slice(0, -1).join(' / ') : 'AMAREA';
        const title = path.basename(parts[parts.length - 1], ext);
        tracks.push({
          title,
          artist,
          src: encodeURI('musica/' + rel),
          duration: '—'
        });
      }
    }
  }
  return tracks;
}

const tracks = scan(MUSIC_DIR, MUSIC_DIR);
const data = { version: 1, generatedAt: new Date().toISOString(), count: tracks.length, tracks };
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`musica/tracks.json generado con ${tracks.length} tracks.`);
