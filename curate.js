const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Curador de multimedia desde Relay.
// Selecciona N items al azar por categoria y los copia a amarea-landing.
// Uso: node curate.js [relay-path] [--delete-source]

const RELAY = process.argv[2] || process.env.RELAY_SOURCE || path.join(__dirname, '..', 'Amarea', 'Relay');
const DELETE_SOURCE = process.argv.includes('--delete-source');

const MM_DEST = path.join(__dirname, 'multimedia');
const MUSIC_DEST = path.join(__dirname, 'musica');

const COUNTS = {
  fotos: 18,
  videos: 8,
  music: 12
};

const videoExts = new Set(['.mp4', '.webm', '.mov', '.ogv', '.mkv', '.avi']);
const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
const audioExts = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.weba']);

function mkdir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function listFiles(dir, allowedExts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (allowedExts.has(ext) && !e.name.startsWith('.')) out.push({ name: e.name, full: path.join(dir, e.name), ext });
  }
  return out;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(files, n) {
  if (files.length <= n) return files;
  return shuffle([...files]).slice(0, n);
}

function copy(source, dest) {
  mkdir(path.dirname(dest));
  fs.copyFileSync(source, dest);
  process.stdout.write('  ' + dest + '\n');
}

const PROTECTED = new Set(['readme.md', '.gitkeep', 'desktop.ini', 'thumbs.db', '.ds_store', 'tracks.json', 'multimedia.json', '.gitignore']);

function cleanDir(dir, keepSet) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      cleanDir(full, keepSet);
      if (fs.readdirSync(full).length === 0) try { fs.rmdirSync(full); } catch (x) {}
    } else if (PROTECTED.has(e.name.toLowerCase()) || keepSet.has(full.toLowerCase())) {
      // keep
    } else {
      fs.unlinkSync(full);
      process.stdout.write('  [x] ' + full + '\n');
    }
  }
}

console.log(`Curando desde: ${path.resolve(RELAY)}`);
mkdir(MM_DEST);
mkdir(MUSIC_DEST);

const fotos = listFiles(path.join(RELAY, 'fotos'), imageExts);
const videos = listFiles(path.join(RELAY, 'videos'), videoExts);
const music = listFiles(path.join(RELAY, 'Musica', 'Summer26'), audioExts);

const selectedFotos = pick(fotos, COUNTS.fotos);
const selectedVideos = pick(videos, COUNTS.videos);
const selectedMusic = pick(music, COUNTS.music);

const keep = new Set();

for (const f of selectedFotos) {
  const dest = path.join(MM_DEST, 'fotos', f.name);
  copy(f.full, dest);
  keep.add(dest.toLowerCase());
}

for (const v of selectedVideos) {
  const dest = path.join(MM_DEST, 'videos', v.name);
  copy(v.full, dest);
  keep.add(dest.toLowerCase());
}

for (const m of selectedMusic) {
  const dest = path.join(MUSIC_DEST, 'Summer26', m.name);
  copy(m.full, dest);
  keep.add(dest.toLowerCase());
}

console.log('Limpiando archivos no seleccionados del destino...');
cleanDir(MM_DEST, keep);
cleanDir(MUSIC_DEST, keep);

if (DELETE_SOURCE) {
  console.log('Eliminando archivos no seleccionados de Relay...');
  const srcKeep = new Set([...selectedFotos.map(f => f.full), ...selectedVideos.map(v => v.full), ...selectedMusic.map(m => m.full)].map(p => p.toLowerCase()));
  cleanDir(path.join(RELAY, 'fotos'), srcKeep);
  cleanDir(path.join(RELAY, 'videos'), srcKeep);
  cleanDir(path.join(RELAY, 'Musica', 'Summer26'), srcKeep);
}

console.log('Generando manifests...');
execSync('node build-media.js && node build-music.js', { stdio: 'inherit' });

const stats = (p) => fs.existsSync(p) ? fs.readdirSync(p, { recursive: true }).filter(f => fs.statSync(path.join(p, f)).isFile()).length : 0;
console.log('\nResumen:');
console.log('  Fotos seleccionadas:', selectedFotos.length, '/', fotos.length);
console.log('  Videos seleccionados:', selectedVideos.length, '/', videos.length);
console.log('  Tracks seleccionados:', selectedMusic.length, '/', music.length);
