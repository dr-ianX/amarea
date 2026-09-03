const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = [
  'app.js', 'features.js', 'cuestionario.js', 'build-config.js',
  'build-media.js', 'build-music.js', 'curate.js', 'sync-relay.js'
];

let failed = false;
for (const f of files) {
  try {
    execSync(`node --check ${f}`, { stdio: 'pipe' });
    console.log(`[ok] ${f}`);
  } catch (e) {
    console.error(`[fail] ${f}`);
    failed = true;
  }
}

for (const f of ['multimedia.json', 'musica/tracks.json']) {
  if (fs.existsSync(f)) {
    const s = fs.statSync(f);
    console.log(`[ok] ${f} ${s.size} bytes`);
  } else {
    console.error(`[missing] ${f}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nTests fallaron.');
  process.exit(1);
}
console.log('\nTests pasaron.');
