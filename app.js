// AMAREA LANDING — interactive engine

const STORAGE_CHAT = 'amarea_chat_v1';
const STORAGE_NICK = 'amarea_nick_v1';
const STORAGE_JOIN = 'amarea_join_v1';
const STORAGE_USERS = 'amarea_users_v1';
const STORAGE_BRIEFS = 'amarea_briefs_v1';
const STORAGE_CURRENT = 'amarea_current_v1';
const STORAGE_DRAFT = 'amarea_draft_v1';
const STORAGE_GAS = 'amarea_gas_url';
const STORAGE_MIXER = 'amarea_mixer_v1';
const CHAT_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const STORAGE_DEVICE = 'amarea_device_v1';
const CONFIG = window.AMAREA_CONFIG || {};
const API_TOKEN = CONFIG.API_TOKEN || '';
const GAS_URL = CONFIG.GAS_URL || '';
const ADMIN_USERNAME = CONFIG.ADMIN_USERNAME || '';
const ADMIN_HASH = CONFIG.ADMIN_HASH || '';

const djNews = [
  { title: 'Residente Akir B estrena set en CRANIA', date: '2026-02-01', tag: 'Residente', summary: 'Un viaje de techno oscuro y disco lunar grabado en vivo durante la última edición AMAREA.' },
  { title: 'Lua Mora prepara EP inspirado en la Baja', date: '2026-01-20', tag: 'Lanzamiento', summary: 'Tres tracks que traducen el viento del Pacífico en ritmos de house introspectivo.' },
  { title: 'Simbionte x Mentesaka: live AV', date: '2025-12-15', tag: 'Live', summary: 'Primera presentación conjunta de hardware, visuales generativos y escultura sonora.' }
];

const caboNews = [
  { title: 'CRANIA abre su residencia de artistas', date: '2026-01-18', tag: 'Venue', summary: 'Convocatoria abierta para productores, visuales y performers en San José del Cabo.' },
  { title: 'Temporada alta de eventos en Los Cabos', date: '2026-01-10', tag: 'Destino', summary: 'Aeropuerto SJD reporta récord de conectividad internacional para primavera.' },
  { title: 'Nueva ruta de gastronomía nocturna', date: '2026-01-05', tag: 'Cultura', summary: 'Bares y restaurantes del centro histórico suman experiencias after-hours.' }
];

let currentUser = JSON.parse(localStorage.getItem(STORAGE_CURRENT) || 'null');
let radarFilter = 'dj';
let deviceId = localStorage.getItem(STORAGE_DEVICE);
let blockedIds = new Set();

function getDeviceId() {
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : 'd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(STORAGE_DEVICE, deviceId);
  }
  return deviceId;
}
getDeviceId();

async function sha256(input) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const GAS_LOG_URL = () => GAS_URL || localStorage.getItem(STORAGE_GAS) || '';

function logToSheet(type, payload) {
  const url = GAS_LOG_URL();
  if (!url) { console.warn('[AMAREA] AMAREA_GAS_URL vacío. No se puede loguear.'); return; }
  if (!API_TOKEN) { console.warn('[AMAREA] AMAREA_API_TOKEN vacío. No se puede loguear.'); return; }
  const body = JSON.stringify({
    token: API_TOKEN,
    type,
    username: currentUser?.username || nickname || 'guest',
    deviceId: getDeviceId(),
    payload
  });
  fetch(url, { method: 'POST', body, mode: 'no-cors' }).catch(() => {});
}

function track(type, payload) { logToSheet(type, payload); }
function trackPageview() {
  track('pageview', {
    path: location.pathname + location.search,
    referrer: document.referrer,
    title: document.title
  });
}

function initAnalytics() {
  const ga = CONFIG.GA_ID;
  if (!ga) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ga);
}

const residents = [
  { name: 'Akir B', role: 'DJ · Techno / Dark Disco', vibe: 'Sets profundos, texturas desérticas.' },
  { name: 'Lua Mora', role: 'DJ · Indie Dance / House', vibe: 'Conexión, calma y explosión controlada.' },
  { name: 'Simbionte', role: 'Live Act · Música electrónica', vibe: 'Hardware, improvisación y energía cruda.' },
  { name: 'Mentesaka', role: 'Visual & Sound', vibe: 'Entornos inmersivos y diseño lumínico.' }
];

var events = [
  {
    title: 'AMAREA at CRANIA',
    date: '2026-02-06T21:00:00',
    location: 'CRANIA · San José del Cabo',
    status: 'Sold Out',
    tag: 'Dark disco · House'
  },
  {
    title: 'AMARÉA at CRANIA',
    date: '2026-06-13T21:00:00',
    location: 'CRANIA · San José del Cabo',
    status: 'Próximamente',
    tag: 'Indie dance · Techno'
  },
  {
    title: 'AMAREA · Playa privada',
    date: '2026-04-18T17:00:00',
    location: 'San José del Cabo · BCS',
    status: 'Anunciado',
    tag: 'Sunset · Balearic'
  },
  {
    title: 'AMAREA · Season Closing',
    date: '2026-11-14T21:00:00',
    location: 'CRANIA · San José del Cabo',
    status: 'RSVP',
    tag: 'Techno · Experiencia'
  }
];

let tracks = [];
let currentTrackIndex = -1;
let audio = new Audio();
let audioCtx = null;
let analyser = null;
let source = null;
let isPlaying = false;
let animationId = null;

// === TABS ===
const tabLinks = document.querySelectorAll('.tab-link, .tab-cta');
const sections = document.querySelectorAll('.tab-section');
const mobileMenu = document.getElementById('mobile-menu');
const menuBtn = document.getElementById('menu-btn');
const nav = document.getElementById('nav');

function updateActiveNav(id) {
  document.querySelectorAll('.tab-link').forEach(l => {
    l.classList.remove('nav-active');
    if (l.dataset.tab === id) l.classList.add('nav-active');
  });
}

function switchTab(id) {
  if (id === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
    switchTab('inicio');
    return;
  }
  const inicio = document.getElementById('inicio');
  if (inicio) {
    if (id === 'inicio') inicio.classList.remove('hero-banner');
    else inicio.classList.add('hero-banner');
  }
  sections.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  updateActiveNav(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (mobileMenu) mobileMenu.classList.add('hidden');
  track('tab', { tab: id });
}

tabLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const id = link.dataset.tab;
    if (id) switchTab(id);
  });
});

menuBtn?.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// === RESIDENTS ===
const residentsGrid = document.getElementById('residents-grid');
residents.forEach((r, i) => {
  const div = document.createElement('div');
  div.className = 'resident-card rounded-2xl p-6';
  div.style.animationDelay = `${i * 80}ms`;
  div.innerHTML = `
    <h3 class="text-2xl font-display font-bold text-white mb-1">${r.name}</h3>
    <p class="text-xs font-mono text-amarea-cyan uppercase tracking-widest mb-4">${r.role}</p>
    <p class="text-sm text-white/50 leading-relaxed">${r.vibe}</p>
  `;
  residentsGrid.appendChild(div);
});

// === EVENTS ===
const eventsList = document.getElementById('events-list');
const now = new Date();

events.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((ev, i) => {
  const d = new Date(ev.date);
  const isPast = d < now;
  const dateStr = d.toLocaleDateString('es-MX', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = 'event-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4';
  div.innerHTML = `
    <div class="flex-1">
      <div class="flex items-center gap-3 mb-2">
        <span class="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-white/5 text-white/60">${ev.tag}</span>
        <span class="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded ${isPast ? 'bg-white/10 text-white/40' : 'bg-amarea-pink/10 text-amarea-pink'}">${isPast ? 'Pasado' : ev.status}</span>
      </div>
      <h3 class="text-2xl md:text-3xl font-display font-bold text-white mb-1">${ev.title}</h3>
      <p class="text-white/50 font-mono text-sm">${dateStr} · ${timeStr}</p>
      <p class="text-white/40 text-sm mt-1">${ev.location}</p>
    </div>
    <div class="flex gap-3">
      ${!isPast ? `<a href="https://www.ticketfairy.com" target="_blank" rel="noopener" class="px-5 py-2 rounded-xl border border-white/10 text-xs font-display font-bold uppercase tracking-widest hover:border-amarea-cyan hover:text-amarea-cyan transition">Tickets</a>` : ''}
      <button class="tab-cta px-5 py-2 rounded-xl border border-white/10 text-xs font-display font-bold uppercase tracking-widest hover:border-amarea-pink transition" data-tab="musica">Sets</button>
    </div>
  `;
  div.querySelectorAll('.tab-cta').forEach(b => b.addEventListener('click', (e) => switchTab(e.target.dataset.tab)));
  eventsList.appendChild(div);
});

// === MINI MIXER ===
let mixerState = JSON.parse(localStorage.getItem(STORAGE_MIXER) || '{}');
let shuffle = mixerState.shuffle || false;
let autoplay = mixerState.autoplay || false;
let mixerSkin = mixerState.skin || 'dark';
let eq = mixerState.eq || { bass: 0, mid: 0, treble: 0 };
let gainNode = null;
let bassFilter = null;
let midFilter = null;
let trebleFilter = null;
let djFilter = null;
let delayNode = null;
let delayInput = null;
let feedbackNode = null;
let delayWet = null;
let bitcrusherNode = null;
let crushWet = null;
let dryGain = null;
let autoDj = false;
let autoDjTransition = false;

function saveMixerState() {
  localStorage.setItem(STORAGE_MIXER, JSON.stringify({ shuffle, autoplay, skin: mixerSkin, eq }));
}

async function loadTracks() {
  try {
    const res = await fetch('musica/tracks.json');
    const data = await res.json();
    tracks = data.tracks || [];
  } catch (e) {
    tracks = [
      { title: 'Demo set — activa el sonido', artist: 'AMAREA', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: '—' }
    ];
  }
  renderTracks();
}

function renderTracks() {
  const list = document.getElementById('track-list');
  list.innerHTML = '';
  if (!tracks.length) {
    list.innerHTML = '<p class="text-sm text-white/30 text-center py-10">No hay sets disponibles.</p>';
    return;
  }
  tracks.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = `track-item rounded-2xl p-4 flex items-center justify-between cursor-pointer ${i === currentTrackIndex ? 'active' : ''}`;
    div.innerHTML = `
      <div class="flex-1 min-w-0">
        <h4 class="font-display font-bold text-white truncate">${t.title}</h4>
        <p class="text-xs text-white/50 font-mono">${t.artist} · ${t.duration || '—'}</p>
      </div>
      <span class="text-2xl text-white/30">▶</span>
    `;
    div.addEventListener('click', () => selectTrack(i));
    list.appendChild(div);
  });
}

function selectTrack(index) {
  if (!tracks.length) return;
  currentTrackIndex = index;
  const t = tracks[currentTrackIndex];
  audio.pause();
  audio.src = t.src;
  const ct = document.getElementById('current-track');
  const ca = document.getElementById('current-artist');
  if (ct) ct.textContent = t.title;
  if (ca) ca.textContent = t.artist;
  renderTracks();
  document.getElementById('vinyl-hero')?.classList.remove('playing');
  if (autoplay || autoDj) playAudio();
  logToSheet('track_select', { title: t.title, artist: t.artist, index });
  updateMiniPlayer();
}

function pickNextTrack() {
  if (!tracks.length) return 0;
  if (shuffle) {
    let n;
    do { n = Math.floor(Math.random() * tracks.length); } while (n === currentTrackIndex && tracks.length > 1);
    return n;
  }
  return (currentTrackIndex + 1) % tracks.length;
}

function pickPrevTrack() {
  if (!tracks.length) return 0;
  if (shuffle) {
    let n;
    do { n = Math.floor(Math.random() * tracks.length); } while (n === currentTrackIndex && tracks.length > 1);
    return n;
  }
  return (currentTrackIndex - 1 + tracks.length) % tracks.length;
}

function playAudio() {
  if (currentTrackIndex < 0) { selectTrack(0); return; }
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  audio.play().then(() => {
    isPlaying = true;
    updatePlayButton();
    document.getElementById('vinyl-hero')?.classList.add('playing');
  }).catch(() => {});
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  updatePlayButton();
  document.getElementById('vinyl-hero')?.classList.remove('playing');
}

function togglePlay() {
  if (currentTrackIndex < 0) { selectTrack(0); return; }
  if (isPlaying) pauseAudio();
  else playAudio();
}

function updatePlayButton() {
  const btn = document.getElementById('play-btn');
  if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
  updateMiniPlayer();
}

function updateMiniPlayer() {
  const t = tracks[currentTrackIndex] || null;
  const title = document.getElementById('mini-title');
  const artist = document.getElementById('mini-artist');
  const play = document.getElementById('mini-play');
  if (title) title.textContent = t ? t.title : '—';
  if (artist) artist.textContent = t ? `${t.artist} · ${t.duration || '—'}` : 'Selecciona un track';
  if (play) play.textContent = isPlaying ? '⏸' : '▶';
}

function updateMixerUI() {
  const mixer = document.getElementById('mini-mixer');
  mixer.dataset.skin = mixerSkin;
  document.getElementById('shuffle-btn').classList.toggle('text-amarea-cyan', shuffle);
  document.getElementById('shuffle-btn').classList.toggle('border-amarea-cyan', shuffle);
  document.getElementById('autoplay-btn').classList.toggle('text-amarea-gold', autoplay);
  document.getElementById('autoplay-btn').classList.toggle('border-amarea-gold', autoplay);
  document.getElementById('skin-label').textContent = `skin: ${mixerSkin} · autoplay: ${autoplay ? 'on' : 'off'}`;
  document.getElementById('eq-bass').value = eq.bass;
  document.getElementById('eq-mid').value = eq.mid;
  document.getElementById('eq-treble').value = eq.treble;
  document.getElementById('eq-bass-val').textContent = eq.bass;
  document.getElementById('eq-mid-val').textContent = eq.mid;
  document.getElementById('eq-treble-val').textContent = eq.treble;
  document.getElementById('volume').value = audio.volume;
  document.getElementById('volume-val').textContent = Math.round(audio.volume * 100) + '%';
}

function setEQ() {
  if (!bassFilter || !midFilter || !trebleFilter) return;
  bassFilter.gain.value = eq.bass;
  midFilter.gain.value = eq.mid;
  trebleFilter.gain.value = eq.treble;
}

function setSkin(skin) {
  mixerSkin = skin;
  updateMixerUI();
  saveMixerState();
}

document.getElementById('play-btn').addEventListener('click', togglePlay);
document.getElementById('next-btn').addEventListener('click', () => selectTrack(pickNextTrack()));
document.getElementById('prev-btn').addEventListener('click', () => selectTrack(pickPrevTrack()));
document.getElementById('shuffle-btn').addEventListener('click', () => {
  shuffle = !shuffle;
  updateMixerUI(); saveMixerState();
});
document.getElementById('autoplay-btn').addEventListener('click', () => {
  autoplay = !autoplay;
  updateMixerUI(); saveMixerState();
});
document.querySelectorAll('.skin-btn').forEach(b => b.addEventListener('click', () => setSkin(b.dataset.skin)));

document.getElementById('volume').addEventListener('input', (e) => {
  audio.volume = parseFloat(e.target.value);
  document.getElementById('volume-val').textContent = Math.round(audio.volume * 100) + '%';
});

['bass','mid','treble'].forEach(k => {
  document.getElementById('eq-' + k).addEventListener('input', (e) => {
    eq[k] = parseInt(e.target.value, 10);
    document.getElementById('eq-' + k + '-val').textContent = eq[k];
    setEQ(); saveMixerState();
  });
});

audio.addEventListener('ended', () => {
  if (autoDj) {
    autoDjTransition = false;
    selectTrack(pickNextTrack());
    if (djFilter) djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 1);
    return;
  }
  if (!autoplay) return;
  selectTrack(pickNextTrack());
});

audio.addEventListener('timeupdate', () => {
  const progress = document.getElementById('progress');
  if (audio.duration) {
    progress.value = (audio.currentTime / audio.duration) * 100;
    document.getElementById('time-current').textContent = formatTime(audio.currentTime);
    document.getElementById('time-total').textContent = formatTime(audio.duration);
  }
  if (autoDj && audio.duration && !autoDjTransition && audio.currentTime > audio.duration - 8) {
    autoDjTransition = true;
    if (djFilter) djFilter.frequency.setTargetAtTime(200, audioCtx.currentTime, 2);
  }
});

audio.addEventListener('loadedmetadata', () => {
  document.getElementById('time-total').textContent = formatTime(audio.duration);
});

document.getElementById('progress').addEventListener('input', (e) => {
  if (audio.duration) {
    audio.currentTime = (e.target.value / 100) * audio.duration;
  }
});

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// === VISUALIZER ===
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

function makeCrushCurve(bits) {
  const steps = Math.max(1, Math.pow(2, bits) - 1);
  const samples = 44100;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = i * 2 / (samples - 1) - 1;
    curve[i] = Math.round((x + 1) / 2 * steps) / steps * 2 - 1;
  }
  return curve;
}

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.85;

  source = audioCtx.createMediaElementSource(audio);
  bassFilter = audioCtx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 100;
  midFilter = audioCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 1;
  trebleFilter = audioCtx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 10000;

  djFilter = audioCtx.createBiquadFilter();
  djFilter.type = 'lowpass';
  djFilter.frequency.value = 20000;
  djFilter.Q.value = 0;

  bitcrusherNode = audioCtx.createWaveShaper();
  bitcrusherNode.curve = makeCrushCurve(8);
  bitcrusherNode.oversample = 'none';

  delayNode = audioCtx.createDelay(2);
  delayNode.delayTime.value = 0.3;
  delayInput = audioCtx.createGain();
  delayInput.gain.value = 0.5;
  feedbackNode = audioCtx.createGain();
  feedbackNode.gain.value = 0.4;
  delayWet = audioCtx.createGain();
  delayWet.gain.value = 0;

  dryGain = audioCtx.createGain();
  dryGain.gain.value = 1;
  crushWet = audioCtx.createGain();
  crushWet.gain.value = 0;

  gainNode = audioCtx.createGain();

  source.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  trebleFilter.connect(djFilter);

  djFilter.connect(dryGain);
  djFilter.connect(bitcrusherNode);
  bitcrusherNode.connect(crushWet);

  djFilter.connect(delayInput);
  delayInput.connect(delayNode);
  delayNode.connect(feedbackNode);
  feedbackNode.connect(delayInput);
  delayNode.connect(delayWet);

  dryGain.connect(gainNode);
  crushWet.connect(gainNode);
  delayWet.connect(gainNode);

  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  setEQ();
  drawVisualizer();
}

function drawVisualizer() {
  if (!analyser) return;
  const bufferLength = analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(data);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxR = Math.min(cx, cy) - 6;
  const bands = 64;
  const step = Math.floor(bufferLength / bands);

  ctx.lineWidth = 1.2;
  for (let i = 0; i < bands; i++) {
    const v = data[i * step] || 0;
    const norm = v / 255;
    const base = 6 + (i / bands) * (maxR - 6);
    const r = base + norm * 18;
    const hue = 300 + (i / bands) * 120;
    const alpha = 0.12 + norm * 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = `hsla(${hue}, 90%, 60%, ${norm})`;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  animationId = requestAnimationFrame(drawVisualizer);
}

function updateDelay() {
  if (!delayNode || !delayWet || !dryGain || !audioCtx) return;
  const enabled = document.getElementById('fx-delay')?.classList.contains('active');
  const time = parseFloat(document.getElementById('delay-time')?.value || 0.3);
  const wet = enabled ? 0.35 : 0;
  delayNode.delayTime.setTargetAtTime(time, audioCtx.currentTime, 0.05);
  delayWet.gain.setTargetAtTime(wet, audioCtx.currentTime, 0.05);
  dryGain.gain.setTargetAtTime(enabled ? 0.8 : 1, audioCtx.currentTime, 0.05);
  const valLabel = document.getElementById('delay-time-val');
  if (valLabel) valLabel.textContent = time.toFixed(2) + 's';
}

function updateCrush() {
  if (!bitcrusherNode || !crushWet || !audioCtx) return;
  const enabled = document.getElementById('fx-crush')?.classList.contains('active');
  const bits = parseInt(document.getElementById('crush-bits')?.value || 8, 10);
  bitcrusherNode.curve = makeCrushCurve(bits);
  crushWet.gain.setTargetAtTime(enabled ? 0.5 : 0, audioCtx.currentTime, 0.05);
  const valLabel = document.getElementById('crush-bits-val');
  if (valLabel) valLabel.textContent = bits;
}

function updateAutoDj() {
  const btn = document.getElementById('fx-autodj');
  if (btn) btn.classList.toggle('active', autoDj);
  if (autoDj && !isPlaying && currentTrackIndex < 0) selectTrack(0);
}

function setXY(x, y) {
  if (!djFilter || !audio || !audioCtx) return;
  const minF = 200, maxF = 20000;
  const freq = minF * Math.pow(maxF / minF, Math.max(0, Math.min(1, x)));
  djFilter.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
  const rate = 0.5 + Math.max(0, Math.min(1, y)) * 2;
  audio.playbackRate = rate;
  const pad = document.getElementById('xy-pad');
  if (pad) {
    const c = pad.getContext('2d');
    c.clearRect(0, 0, pad.width, pad.height);
    c.fillStyle = 'rgba(0, 240, 255, 0.25)';
    c.beginPath();
    c.arc(x * pad.width, (1 - y) * pad.height, 8, 0, Math.PI * 2);
    c.fill();
  }
}

function bindDjPad() {
  const pad = document.getElementById('xy-pad');
  if (!pad) return;
  const handle = (e) => {
    const rect = pad.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    let x = (cx - rect.left) / rect.width;
    let y = 1 - (cy - rect.top) / rect.height;
    setXY(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
  };
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); handle(e); });
  pad.addEventListener('pointermove', (e) => { if (e.buttons) handle(e); });
  pad.addEventListener('pointerup', () => { setXY(0.5, 0.5); });
}

function toggleAutoDj() {
  autoDj = !autoDj;
  updateAutoDj();
}

document.getElementById('fx-delay')?.addEventListener('click', () => { document.getElementById('fx-delay').classList.toggle('active'); updateDelay(); });
document.getElementById('fx-crush')?.addEventListener('click', () => { document.getElementById('fx-crush').classList.toggle('active'); updateCrush(); });
document.getElementById('fx-autodj')?.addEventListener('click', toggleAutoDj);
document.getElementById('delay-time')?.addEventListener('input', updateDelay);
document.getElementById('crush-bits')?.addEventListener('input', updateCrush);
bindDjPad();

// === CHAT ===
const chatNick = document.getElementById('chat-nick');
const setNickBtn = document.getElementById('set-nick');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');
const chatReply = document.getElementById('chat-reply');
const chatReplyLabel = document.getElementById('chat-reply-label');
const chatReplyCancel = document.getElementById('chat-reply-cancel');

let nickname = localStorage.getItem(STORAGE_NICK) || '';
let chatData = JSON.parse(localStorage.getItem(STORAGE_CHAT) || '[]');
let chatLast = 0;
let replyTo = null;
let chatAudioCtx = null;

function playTone() {
  if (!chatAudioCtx) chatAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (chatAudioCtx.state === 'suspended') chatAudioCtx.resume();
  const osc = chatAudioCtx.createOscillator();
  const gain = chatAudioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, chatAudioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, chatAudioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.2, chatAudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, chatAudioCtx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(chatAudioCtx.destination);
  osc.start();
  osc.stop(chatAudioCtx.currentTime + 0.25);
  if (navigator.vibrate) navigator.vibrate(80);
}

function requestChatNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showMsgNotification(msg) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!document.hidden || msg.author === nickname) return;
  try {
    new Notification('Nuevo mensaje en AMAREA', {
      body: `${msg.author}: ${msg.text}`,
      icon: 'https://favicon.io/emoji/🌙' // se ignora si falla
    });
  } catch (e) {}
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  const palette = [310, 180, 45, 270, 20, 140];
  return palette[Math.abs(h) % palette.length];
}

function pruneChat() {
  const now = Date.now();
  const before = chatData.length;
  chatData = chatData.filter(m => now - new Date(m.date).getTime() < CHAT_TTL_MS);
  if (chatData.length !== before) localStorage.setItem(STORAGE_CHAT, JSON.stringify(chatData));
}

function escapeHTML(t) { return String(t).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

if (nickname) {
  chatNick.value = nickname;
  chatInput.disabled = false;
  chatSend.disabled = false;
}

function startReply(id) {
  const msg = chatData.find(m => m.id === id);
  if (!msg) return;
  replyTo = id;
  chatReply.classList.remove('hidden');
  chatReplyLabel.textContent = `${msg.author}: ${msg.text}`;
  chatInput.focus();
}

function cancelReply() {
  replyTo = null;
  chatReply.classList.add('hidden');
  chatReplyLabel.textContent = '';
}

chatReplyCancel.addEventListener('click', cancelReply);

function renderChat() {
  chatMessages.innerHTML = '';
  chatData.forEach((msg, idx) => {
    const isOwn = msg.author === nickname;
    const div = document.createElement('div');
    div.className = `chat-msg ${isOwn ? 'own' : 'other'}`;
    const hue = hashColor(msg.author);
    const initial = escapeHTML(msg.author.slice(0, 1).toUpperCase());
    const replyHTML = msg.replyTo ? (() => {
      const r = chatData.find(m => m.id === msg.replyTo);
      return r ? `<p class="text-[10px] text-white/30 mb-1 border-l-2 pl-2" style="border-color:hsl(${hashColor(r.author)},80%,60%)">↩ ${escapeHTML(r.author)}: ${escapeHTML(r.text)}</p>` : '';
    })() : '';
    const deleteBtn = isOwn ? `<button class="chat-del" data-del="${msg.id}" title="Borrar">×</button>` : '';
    const replyBtn = `<button class="chat-reply" data-reply="${msg.id}" title="Responder">↩</button>`;
    const time = new Date(msg.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      <div class="chat-meta">
        <span class="chat-avatar" style="background:hsl(${hue},80%,45%)">${initial}</span>
        <span class="chat-author" style="color:hsl(${hue},80%,70%)">${escapeHTML(msg.author)}</span>
        <span class="chat-time">${time}</span>
        <span class="chat-actions">${replyBtn}${deleteBtn}</span>
      </div>
      ${replyHTML}
      <p class="chat-text">${escapeHTML(msg.text)}</p>
    `;
    chatMessages.appendChild(div);
  });

  chatMessages.querySelectorAll('.chat-reply').forEach(b => b.addEventListener('click', (e) => startReply(e.target.dataset.reply)));
  chatMessages.querySelectorAll('.chat-del').forEach(b => b.addEventListener('click', (e) => deleteMessage(e.target.dataset.del)));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(text) {
  if (!nickname || !text.trim()) return;
  if (blockedIds.has(getDeviceId())) {
    chatInput.disabled = true;
    chatSend.disabled = true;
    chatInput.placeholder = 'Usuario bloqueado.';
    return;
  }
  const msg = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    author: nickname,
    deviceId: getDeviceId(),
    text: text.trim(),
    date: new Date().toISOString(),
    replyTo: replyTo || undefined
  };
  chatData.push(msg);
  if (chatData.length > 200) chatData = chatData.slice(-200);
  pruneChat();
  localStorage.setItem(STORAGE_CHAT, JSON.stringify(chatData));
  logToSheet('chat', msg);
  cancelReply();
  renderChat();
}

function deleteMessage(id) {
  const msg = chatData.find(m => m.id === id);
  if (!msg || msg.author !== nickname) return;
  chatData = chatData.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_CHAT, JSON.stringify(chatData));
  logToSheet('delete_msg', { id, deviceId: getDeviceId() });
  renderChat();
}

setNickBtn.addEventListener('click', () => {
  const val = chatNick.value.trim();
  if (val) {
    nickname = val;
    localStorage.setItem(STORAGE_NICK, nickname);
    chatInput.disabled = false;
    chatSend.disabled = false;
    chatInput.focus();
    requestChatNotifications();
    renderChat();
  }
});

chatSend.addEventListener('click', () => {
  addMessage(chatInput.value);
  chatInput.value = '';
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addMessage(chatInput.value);
    chatInput.value = '';
  }
});

pruneChat();
renderChat();

function loadBlocked() {
  const url = GAS_LOG_URL();
  if (!url) return;
  const cb = 'amareaBlocks_' + Math.random().toString(36).slice(2, 9);
  window[cb] = (ids) => {
    blockedIds = new Set(ids || []);
    if (blockedIds.has(getDeviceId())) {
      chatInput.disabled = true;
      chatSend.disabled = true;
      chatInput.placeholder = 'Usuario bloqueado.';
    }
    delete window[cb];
  };
  const script = document.createElement('script');
  script.src = `${url}?callback=${cb}&view=blocks&token=${encodeURIComponent(API_TOKEN)}`;
  script.onerror = () => { delete window[cb]; };
  document.body.appendChild(script);
}

function updateChatLast() {
  chatLast = chatData.length ? Math.max(...chatData.map(m => new Date(m.date).getTime())) : 0;
}

function loadChatFromSheets() {
  const url = GAS_LOG_URL();
  if (!url) return;
  updateChatLast();
  const cb = 'amareaChat_' + Math.random().toString(36).slice(2, 9);
  window[cb] = (res) => {
    if (!res || !Array.isArray(res.messages)) { delete window[cb]; return; }
    const byId = new Map(chatData.map(m => [m.id, m]));
    const newRemote = [];
    let changed = false;
    res.messages.forEach(m => {
      if (m && m.id && !byId.has(m.id)) {
        byId.set(m.id, m);
        newRemote.push(m);
        changed = true;
      }
    });
    if (res.deletes) res.deletes.forEach(id => {
      if (byId.has(id)) { byId.delete(id); changed = true; }
    });
    if (changed) {
      chatData = [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
      if (chatData.length > 200) chatData = chatData.slice(-200);
      pruneChat();
      localStorage.setItem(STORAGE_CHAT, JSON.stringify(chatData));
      renderChat();
      if (newRemote.length) {
        playTone();
        newRemote.forEach(m => showMsgNotification(m));
      }
    }
    delete window[cb];
  };
  const script = document.createElement('script');
  script.src = `${url}?callback=${cb}&view=chat&last=${chatLast}&token=${encodeURIComponent(API_TOKEN)}`;
  script.onerror = () => { delete window[cb]; };
  document.head.appendChild(script);
}

// === JOIN FORM ===
const joinForm = document.getElementById('join-form');
const joinMsg = document.getElementById('join-msg');

joinForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('join-email').value.trim();
  if (email) {
    const list = JSON.parse(localStorage.getItem(STORAGE_JOIN) || '[]');
    list.push({ email, date: new Date().toISOString() });
    localStorage.setItem(STORAGE_JOIN, JSON.stringify(list));
    logToSheet('join', { email, date: new Date().toISOString() });
    joinMsg.classList.remove('hidden');
    joinForm.reset();
    setTimeout(() => joinMsg.classList.add('hidden'), 5000);
  }
});

// === AUTH / ROLES ===
const authModal = document.getElementById('auth-modal');
const authToggle = document.getElementById('auth-toggle');
const authToggleMobile = document.getElementById('auth-toggle-mobile');
const authClose = document.getElementById('auth-close');
const authForm = document.getElementById('auth-form');
const authRegister = document.getElementById('auth-register');
const authGuest = document.getElementById('auth-guest');
const authError = document.getElementById('auth-error');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

function getUsers() { return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]'); }
function setUsers(users) { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }
function getBriefs() { return JSON.parse(localStorage.getItem(STORAGE_BRIEFS) || '[]'); }
function setBriefs(list) { localStorage.setItem(STORAGE_BRIEFS, JSON.stringify(list)); }

function seedAdmin() {
  // admin ya no se almacena en localStorage; se valida contra ADMIN_HASH
}

function saveCurrent() {
  if (currentUser) localStorage.setItem(STORAGE_CURRENT, JSON.stringify(currentUser));
  else localStorage.removeItem(STORAGE_CURRENT);
}

function showAuth() { authModal.classList.remove('hidden'); authModal.classList.add('flex'); }
function closeAuth() { authModal.classList.add('hidden'); authModal.classList.remove('flex'); authError.classList.add('hidden'); }

function updateAuthUI() {
  if (currentUser) {
    authToggle.textContent = 'SALIR';
    authToggleMobile.textContent = 'SALIR';
    authTitle.textContent = 'Hola, ' + currentUser.username;
    authSubtitle.textContent = 'Rol: ' + currentUser.role;
    document.querySelectorAll('.admin-link').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
  } else {
    authToggle.textContent = 'ENTRAR';
    authToggleMobile.textContent = 'ENTRAR';
    authTitle.textContent = 'Entrar';
    authSubtitle.textContent = 'Invitados pueden navegar. Clientes inician sesión.';
    document.querySelectorAll('.admin-link').forEach(el => el.classList.add('hidden'));
  }
  renderBriefFormGate();
  if (currentUser && currentUser.role === 'admin') renderAdmin();
}

const ROLES = ['invitado', 'cliente', 'colaborador', 'residente', 'admin'];
const ROLE_LEVEL = Object.fromEntries(ROLES.map((r, i) => [r, i]));

function hasAccess(userRole, minRole) {
  return (ROLE_LEVEL[userRole || 'invitado'] || 0) >= (ROLE_LEVEL[minRole] || 0);
}

function fetchUserRole(username) {
  return new Promise((resolve) => {
    const url = GAS_LOG_URL();
    if (!url || !API_TOKEN) { resolve(null); return; }
    const cb = 'amareaRole_' + Math.random().toString(36).slice(2, 9);
    const t = setTimeout(() => { delete window[cb]; resolve(null); }, 5000);
    window[cb] = (roles) => {
      clearTimeout(t);
      delete window[cb];
      resolve(roles && typeof roles === 'object' && roles[username] ? roles[username] : null);
    };
    const s = document.createElement('script');
    s.src = `${url}?callback=${cb}&view=user_roles&token=${encodeURIComponent(API_TOKEN)}`;
    s.onerror = () => { clearTimeout(t); delete window[cb]; resolve(null); };
    document.head.appendChild(s);
  });
}

async function login(username, password) {
  if (ADMIN_USERNAME && ADMIN_HASH && username === ADMIN_USERNAME) {
    const h = await sha256(password);
    if (h === ADMIN_HASH) {
      currentUser = { username, role: 'admin' };
      saveCurrent();
      updateAuthUI();
      logToSheet('login', { id: username, role: 'admin' });
      closeAuth();
      return true;
    }
    return false;
  }
  const users = getUsers();
  const found = users.find(u => u.username === username && u.password === password);
  if (found) {
    const serverRole = await fetchUserRole(found.username);
    const role = serverRole || found.role || 'invitado';
    currentUser = { username: found.username, role };
    saveCurrent();
    updateAuthUI();
    logToSheet('login', { id: found.username, role });
    closeAuth();
    return true;
  }
  return false;
}

function register(username, password) {
  const users = getUsers();
  if (users.find(u => u.username === username)) return false;
  if (ADMIN_USERNAME && username === ADMIN_USERNAME) return false;
  users.push({ username, password, role: 'invitado' });
  setUsers(users);
  currentUser = { username, role: 'invitado' };
  saveCurrent();
  updateAuthUI();
  logToSheet('register', { id: username, role: 'invitado' });
  closeAuth();
  return true;
}

function logout() {
  currentUser = null;
  saveCurrent();
  updateAuthUI();
  switchTab('inicio');
}

function initAuth() {
  authToggle.addEventListener('click', () => { currentUser ? logout() : showAuth(); });
  authToggleMobile.addEventListener('click', () => { currentUser ? logout() : showAuth(); });
  authClose.addEventListener('click', closeAuth);
  authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuth(); });
  authGuest.addEventListener('click', closeAuth);

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    if (await login(u, p)) { authForm.reset(); return; }
    authError.textContent = 'Usuario o contraseña incorrectos.';
    authError.classList.remove('hidden');
  });

  authRegister.addEventListener('click', () => {
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    if (u.length < 3 || p.length < 4) {
      authError.textContent = 'Mínimo 3 caracteres de usuario y 4 de contraseña.';
      authError.classList.remove('hidden');
      return;
    }
    if (register(u, p)) { authForm.reset(); return; }
    authError.textContent = 'El usuario ya existe.';
    authError.classList.remove('hidden');
  });

  updateAuthUI();
}

// === RADAR / NOTICIAS ===
const radarGrid = document.getElementById('radar-grid');
const btnDj = document.getElementById('radar-dj');
const btnCabo = document.getElementById('radar-cabo');

function renderRadar() {
  const data = radarFilter === 'dj' ? djNews : caboNews;
  const activeClass = 'border-amarea-cyan/30 text-amarea-cyan bg-amarea-cyan/10';
  const inactiveClass = 'border-white/10 text-white/60 hover:border-amarea-gold hover:text-amarea-gold';

  btnDj.className = `px-5 py-2 rounded-full border text-xs font-display font-bold uppercase tracking-widest transition ${radarFilter === 'dj' ? activeClass : inactiveClass}`;
  btnCabo.className = `px-5 py-2 rounded-full border text-xs font-display font-bold uppercase tracking-widest transition ${radarFilter === 'cabo' ? 'border-amarea-gold/30 text-amarea-gold bg-amarea-gold/10' : inactiveClass}`;

  radarGrid.innerHTML = '';
  data.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'radar-card rounded-2xl p-6 relative overflow-hidden group';
    div.innerHTML = `
      <span class="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-white/5 text-white/60">${n.tag}</span>
      <p class="text-xs text-white/30 font-mono mb-3">${n.date}</p>
      <h3 class="text-xl font-display font-bold text-white mb-3 group-hover:text-amarea-cyan transition-colors">${n.title}</h3>
      <p class="text-sm text-white/50 leading-relaxed">${n.summary}</p>
    `;
    radarGrid.appendChild(div);
  });
}

btnDj.addEventListener('click', () => { radarFilter = 'dj'; renderRadar(); });
btnCabo.addEventListener('click', () => { radarFilter = 'cabo'; renderRadar(); });

// === CUESTIONARIO WIZARD ===
const briefWizard = document.getElementById('brief-wizard');
const briefForm = document.getElementById('brief-form');
const briefStep = document.getElementById('brief-step');
const briefPrev = document.getElementById('brief-prev');
const briefNext = document.getElementById('brief-next');
const briefSave = document.getElementById('brief-save');
const briefSubmit = document.getElementById('brief-submit');
const briefProgress = document.getElementById('brief-progress');
const briefMsg = document.getElementById('brief-msg');

let currentStep = 0;
let answers = {};

function draftKey() { return STORAGE_DRAFT + '_' + (currentUser?.username || 'guest'); }

function loadDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveDraft() {
  localStorage.setItem(draftKey(), JSON.stringify(answers));
}

function updateAnswers() {
  if (!briefStep) return;
  briefStep.querySelectorAll('textarea[data-qid]').forEach(ta => {
    answers[ta.dataset.qid] = ta.value;
  });
  answers.__step = currentStep;
  saveDraft();
}

function renderProgress() {
  if (!briefProgress) return;
  briefProgress.innerHTML = '';
  CUESTIONARIO.forEach((sec, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition ${i === currentStep ? 'border-amarea-pink text-amarea-pink' : 'border-white/10 text-white/40 hover:border-amarea-cyan hover:text-amarea-cyan'}`;
    dot.textContent = `${i + 1}. ${sec.title}`;
    dot.addEventListener('click', () => {
      updateAnswers();
      currentStep = i;
      answers.__step = currentStep;
      saveDraft();
      renderStep();
      updateNav();
    });
    briefProgress.appendChild(dot);
  });
}

function renderStep() {
  if (!briefStep || !CUESTIONARIO[currentStep]) return;
  const sec = CUESTIONARIO[currentStep];
  const first = sec.questions[0].id.replace('q', '');
  const last = sec.questions[sec.questions.length - 1].id.replace('q', '');
  briefStep.innerHTML = `<h3 class="text-2xl md:text-3xl font-display font-bold mb-2 text-amarea-cyan">${sec.title}</h3><p class="text-white/40 text-sm mb-6">Preguntas ${first}–${last} · ${sec.questions.length} respuestas</p>`;

  sec.questions.forEach(q => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-6';
    const label = document.createElement('label');
    label.className = 'block text-sm font-medium text-white/80 mb-2 leading-relaxed';
    label.textContent = q.text;
    const ta = document.createElement('textarea');
    ta.className = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-pink outline-none min-h-[100px] resize-y';
    ta.dataset.qid = q.id;
    ta.value = answers[q.id] || '';
    ta.placeholder = 'Escribe aquí...';
    ta.addEventListener('input', updateAnswers);
    wrapper.appendChild(label);
    wrapper.appendChild(ta);
    briefStep.appendChild(wrapper);
  });
  renderProgress();
}

function updateNav() {
  if (briefPrev) briefPrev.classList.toggle('hidden', currentStep === 0);
  if (briefNext) briefNext.classList.toggle('hidden', currentStep === CUESTIONARIO.length - 1);
  if (briefSubmit) briefSubmit.classList.toggle('hidden', currentStep !== CUESTIONARIO.length - 1);
}

function nextStep() {
  if (currentStep < CUESTIONARIO.length - 1) {
    updateAnswers();
    currentStep++;
    answers.__step = currentStep;
    saveDraft();
    renderStep();
    updateNav();
    briefStep?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function prevStep() {
  if (currentStep > 0) {
    updateAnswers();
    currentStep--;
    answers.__step = currentStep;
    saveDraft();
    renderStep();
    updateNav();
    briefStep?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderBriefFormGate() {
  if (!briefWizard) return;
  if (!currentUser || (currentUser.role !== 'cliente' && currentUser.role !== 'admin')) {
    briefWizard.classList.add('hidden');
    briefMsg.textContent = 'Inicia sesión como cliente para responder el cuestionario.';
    briefMsg.classList.remove('hidden', 'text-amarea-cyan');
    briefMsg.classList.add('text-white/50');
  } else {
    briefMsg.classList.add('hidden');
    briefWizard.classList.remove('hidden');
    answers = loadDraft();
    currentStep = Math.max(0, Math.min(answers.__step || 0, CUESTIONARIO.length - 1));
    renderStep();
    updateNav();
  }
}

briefPrev?.addEventListener('click', prevStep);
briefNext?.addEventListener('click', nextStep);
briefSave?.addEventListener('click', () => {
  updateAnswers();
  saveDraft();
  briefMsg.textContent = 'Borrador guardado.';
  briefMsg.classList.remove('hidden', 'text-white/50');
  briefMsg.classList.add('text-amarea-cyan');
});

briefForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUser || (currentUser.role !== 'cliente' && currentUser.role !== 'admin')) return;
  updateAnswers();
  const answersCopy = { ...answers };
  delete answersCopy.__step;
  const submission = { user: currentUser.username, date: new Date().toISOString(), answers: answersCopy };
  const list = getBriefs();
  list.push(submission);
  setBriefs(list);
  logToSheet('cuestionario', submission);
  localStorage.removeItem(draftKey());
  answers = {};
  currentStep = 0;
  briefStep.innerHTML = '';
  briefWizard.classList.add('hidden');
  briefMsg.textContent = 'Cuestionario enviado. Gracias.';
  briefMsg.classList.remove('hidden', 'text-white/50');
  briefMsg.classList.add('text-amarea-cyan');
  if (currentUser.role === 'admin') renderAdmin();
});

// === ADMIN PANEL ===
function renderAdmin() {
  const briefs = getBriefs().slice().reverse();
  const users = getUsers();
  const briefsContainer = document.getElementById('admin-briefs');
  const usersContainer = document.getElementById('admin-users');
  if (!briefsContainer || !usersContainer) return;

  briefsContainer.innerHTML = briefs.length ? '' : '<p class="text-white/30 text-sm">Sin cuestionarios aún.</p>';
  briefs.forEach((b, i) => {
    const answered = Object.values(b.answers || {}).filter(a => (a || '').toString().trim()).length;
    const div = document.createElement('div');
    div.className = 'p-5 rounded-2xl border border-white/5 bg-white/[0.02]';
    const header = document.createElement('div');
    header.innerHTML = `
      <p class="text-[10px] text-white/30 font-mono uppercase tracking-widest mb-2">${new Date(b.date).toLocaleString('es-MX')} · ${b.user}</p>
      <p class="font-display font-bold text-white mb-1">Cuestionario · ${answered} de 161 preguntas respondidas</p>
    `;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mt-3 text-xs text-amarea-cyan hover:text-white transition font-display uppercase tracking-widest';
    toggle.textContent = 'Ver respuestas';
    const details = document.createElement('div');
    details.className = 'hidden mt-6 space-y-6';
    CUESTIONARIO.forEach(sec => {
      const group = document.createElement('div');
      group.className = 'border-l-2 border-amarea-cyan/20 pl-4';
      group.innerHTML = `<h4 class="font-display font-bold text-amarea-cyan mb-3">${sec.title}</h4>`;
      sec.questions.forEach(q => {
        const a = (b.answers || {})[q.id] || '';
        if (!a.trim()) return;
        const p = document.createElement('div');
        p.className = 'mb-4';
        p.innerHTML = `<p class="text-sm text-white/80 font-medium mb-1">${q.id.replace('q', '')}. ${q.text}</p><p class="text-sm text-white/60 italic">“${a}”</p>`;
        group.appendChild(p);
      });
      details.appendChild(group);
    });
    toggle.addEventListener('click', () => { details.classList.toggle('hidden'); toggle.textContent = details.classList.contains('hidden') ? 'Ver respuestas' : 'Ocultar respuestas'; });
    div.appendChild(header);
    div.appendChild(toggle);
    div.appendChild(details);
    briefsContainer.appendChild(div);
  });

  usersContainer.innerHTML = '';
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex justify-between items-center';
    div.innerHTML = `
      <span class="font-display font-bold text-white">${u.username}</span>
      <span class="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded ${u.role === 'admin' ? 'bg-amarea-fire/10 text-amarea-fire' : 'bg-amarea-cyan/10 text-amarea-cyan'}">${u.role}</span>
    `;
    usersContainer.appendChild(div);
  });
}

function exportJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('export-briefs')?.addEventListener('click', () => exportJSON('amarea-briefs.json', getBriefs()));
document.getElementById('export-users')?.addEventListener('click', () => exportJSON('amarea-users.json', getUsers()));

// === DUST / PARTICLES CANVAS ===
const dustCanvas = document.getElementById('dust');
const dCtx = dustCanvas.getContext('2d');
let particles = [];
let w, h;

function resizeDust() {
  w = window.innerWidth;
  h = window.innerHeight;
  dustCanvas.width = w;
  dustCanvas.height = h;
}

function initParticles() {
  particles = [];
  const count = Math.min(80, Math.floor(w * h / 18000));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.4 + 0.1
    });
  }
}

function drawDust() {
  dCtx.clearRect(0, 0, w, h);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;
    dCtx.beginPath();
    dCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    dCtx.fillStyle = `rgba(255, 255, 255, ${p.a})`;
    dCtx.fill();
  });
  requestAnimationFrame(drawDust);
}

window.addEventListener('resize', () => { resizeDust(); initParticles(); });
resizeDust();
initParticles();
drawDust();

// === SPOTLIGHT ===
const spotlight = document.getElementById('spotlight');
if (spotlight) {
  document.addEventListener('mousemove', (e) => {
    spotlight.style.setProperty('--x', (e.clientX / window.innerWidth) * 100 + '%');
    spotlight.style.setProperty('--y', (e.clientY / window.innerHeight) * 100 + '%');
  });
}

function initMedia() {
  const bg = document.getElementById('media-bg');
  if (!bg) return;
  fetch('multimedia.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.items || !data.items.length) return;
      const mediaList = data.items;
      const slots = [];
      for (let i = 0; i < 2; i++) {
        const slot = document.createElement('div');
        slot.className = 'absolute inset-0 transition-opacity duration-1000 ease-in-out';
        slot.style.opacity = '0';
        bg.appendChild(slot);
        slots.push(slot);
      }
      let currentIndex = -1;
      let activeSlot = 0;

      function showNext() {
        let nextIndex;
        do { nextIndex = Math.floor(Math.random() * mediaList.length); }
        while (nextIndex === currentIndex && mediaList.length > 1);
        currentIndex = nextIndex;
        activeSlot = (activeSlot + 1) % 2;
        const item = mediaList[currentIndex];
        const slot = slots[activeSlot];
        slot.innerHTML = '';
        let el;
        const loaded = () => {
          slot.style.opacity = '1';
          setTimeout(() => {
            slots.forEach((s, i) => { if (i !== activeSlot) s.style.opacity = '0'; });
          }, 50);
        };
        if (item.type === 'video') {
          el = document.createElement('video');
          el.src = item.path;
          el.muted = true;
          el.loop = true;
          el.playsInline = true;
          el.autoplay = true;
          el.preload = 'metadata';
          el.className = 'w-full h-full object-cover';
          el.onloadeddata = loaded;
          el.onerror = loaded;
        } else {
          el = document.createElement('img');
          el.src = item.path;
          el.alt = '';
          el.decoding = 'async';
          el.className = 'w-full h-full object-cover';
          el.onload = loaded;
          el.onerror = loaded;
        }
        slot.appendChild(el);
        const duration = item.type === 'video'
          ? 10000 + Math.random() * 10000
          : 7000 + Math.random() * 8000;
        setTimeout(showNext, duration);
      }

      showNext();
    })
    .catch(() => {});
}

// === INIT ===
seedAdmin();
initAnalytics();
initAuth();
loadTracks();
renderRadar();
loadBlocked();
loadChatFromSheets();
setInterval(loadChatFromSheets, 5000);
initMedia();
updateMixerUI();
if (currentUser && currentUser.role === 'admin') renderAdmin();
switchTab('inicio');
trackPageview();
window.miniPlay = togglePlay;
window.miniNext = () => selectTrack(pickNextTrack());
window.miniPrev = () => selectTrack(pickPrevTrack());
updateMiniPlayer();
