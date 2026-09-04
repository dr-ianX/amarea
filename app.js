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
const STORAGE_CONTENT = 'amarea_content_v1';
const CHAT_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const STORAGE_DEVICE = 'amarea_device_v1';
const CONFIG = window.AMAREA_CONFIG || {};
const API_TOKEN = CONFIG.API_TOKEN || '';
const GAS_URL = CONFIG.GAS_URL || '';
const ADMIN_USERNAME = CONFIG.ADMIN_USERNAME || '';
const ADMIN_HASH = CONFIG.ADMIN_HASH || '';

const DEFAULT_DJ_NEWS = [
  { title: 'Residente Akir B estrena set en CRANIA', date: '2026-02-01', tag: 'Residente', summary: 'Un viaje de techno oscuro y disco lunar grabado en vivo durante la última edición AMAREA.' },
  { title: 'Lua Mora prepara EP inspirado en la Baja', date: '2026-01-20', tag: 'Lanzamiento', summary: 'Tres tracks que traducen el viento del Pacífico en ritmos de house introspectivo.' },
  { title: 'Simbionte x Mentesaka: live AV', date: '2025-12-15', tag: 'Live', summary: 'Primera presentación conjunta de hardware, visuales generativos y escultura sonora.' }
];
let djNews = [...DEFAULT_DJ_NEWS];

const DEFAULT_CABO_NEWS = [
  { title: 'CRANIA abre su residencia de artistas', date: '2026-01-18', tag: 'Venue', summary: 'Convocatoria abierta para productores, visuales y performers en San José del Cabo.' },
  { title: 'Temporada alta de eventos en Los Cabos', date: '2026-01-10', tag: 'Destino', summary: 'Aeropuerto SJD reporta récord de conectividad internacional para primavera.' },
  { title: 'Nueva ruta de gastronomía nocturna', date: '2026-01-05', tag: 'Cultura', summary: 'Bares y restaurantes del centro histórico suman experiencias after-hours.' }
];
let caboNews = [...DEFAULT_CABO_NEWS];

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

const DEFAULT_RESIDENTS = [
  {
    name: 'JOHANN',
    role: 'DJ principal',
    bio: 'Seleccionador implacable. Construye sets que navegan entre el house profundo y la techno con alma.',
    links: { instagram: '#', soundcloud: '#' }
  },
  {
    name: 'JU BODENSDEDT',
    role: 'DJ principal',
    bio: 'Versátil y preciso. Lee la pista de baile como pocos y conduce la noche sin perder la sorpresa.',
    links: { instagram: '#', soundcloud: '#' }
  },
  {
    name: 'dR.iAn',
    role: 'colaborador',
    bio: 'Láseres, visuales e iluminación en las fiestas de AMAREA. Productor de techno y sets en vivo; a veces mezcla.',
    image: 'assets/logo.png',
    links: { soundcloud: '#', instagram: 'https://instagram.com/drian.mx' }
  }
];
let residents = [...DEFAULT_RESIDENTS];

const DEFAULT_EVENTS = [
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
let events = [...DEFAULT_EVENTS];

let tracks = [];
let currentTrackIndex = -1;
let audio = new Audio();
let audioCtx = null;
let analyser = null;
let source = null;
let isPlaying = false;
let animationId = null;

let deckB = new Audio();
let deckBPlaying = false;
let deckBTitle = '';
let masterVolume = 1;
let crossValue = 0;
let localTracks = [];
let currentBufferA = null;
let currentBufferB = null;
let waveformZoom = 4;
let waveformACanvas = null, waveformBCanvas = null;
let waveformACtx = null, waveformBCtx = null;

let sourceB = null;
let crossGainA = null;
let crossGainB = null;
let masterGain = null;
let lowGain = null;
let midGain = null;
let highGain = null;
let midLowFilter = null;
let midHighFilter = null;
let reverbNode = null;
let reverbWet = null;
let reverbOn = false;
let reverbMix = 0.3;
let lfo = null;
let lfoGain = null;
let flangerDelay = null;
let flangerFeedback = null;
let flangerMix = null;

let loopOn = false;
let loopStart = 0;
let loopEnd = 0;
let loopBpm = 128;

let cueA = -1;
let cueB = -1;
let isScrubbingA = false, wasPlayingA = false;
let isScrubbingB = false, wasPlayingB = false;
let pitchA = 1, pitchB = 1;

const VISUALIZER_MODES = ['circles','bars','wave','spiral','grid','particles','nebula','scope'];
let visMode = 'circles';
let visModeTimer = null;
let visHueShift = 0;

function tr(key, fallback = '') {
  return (typeof window.t === 'function' ? window.t(key, fallback) : fallback) || fallback;
}

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
  if (id === 'admin' && (!currentUser || !hasPermission(currentUser.role, 'adminPanel', currentUser.permissions))) {
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
function saveResidents() {
  siteContent.residentes = residents;
  localStorage.setItem(STORAGE_CONTENT, JSON.stringify(siteContent));
}

function renderResidents() {
  const residentsGrid = document.getElementById('residents-grid');
  if (!residentsGrid) return;
  residentsGrid.innerHTML = '';
  const canEdit = currentUser && currentUser.role === 'admin';
  residents.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'resident-card rounded-2xl p-6';
    div.style.animationDelay = `${i * 80}ms`;
    const img = r.image ? `<div class="w-16 h-16 rounded-full bg-black/40 border border-white/10 mb-4 overflow-hidden"><img src="${r.image}" alt="${r.name}" class="w-full h-full object-cover" onerror="this.style.display='none'"></div>` : '';
    const controls = canEdit ? `
      <div class="flex gap-2 mt-4">
        <button data-dir="up" data-index="${i}" class="res-move px-2 py-1 text-[10px] rounded border border-white/10 hover:border-amarea-cyan transition">↑</button>
        <button data-dir="down" data-index="${i}" class="res-move px-2 py-1 text-[10px] rounded border border-white/10 hover:border-amarea-cyan transition">↓</button>
        <button data-del="${i}" class="res-del px-2 py-1 text-[10px] rounded border border-amarea-fire/30 text-amarea-fire hover:bg-amarea-fire/10 transition">×</button>
      </div>` : '';
    div.innerHTML = `
      ${img}
      <h3 class="text-2xl font-display font-bold text-white mb-1">${r.name}</h3>
      <p class="text-xs font-mono text-amarea-cyan uppercase tracking-widest mb-4 ${canEdit ? 'res-role outline-none focus:border-b focus:border-amarea-cyan' : ''}" ${canEdit ? 'contenteditable="true"' : ''} data-index="${i}">${r.role}</p>
      <p class="text-sm text-white/50 leading-relaxed ${canEdit ? 'res-bio outline-none focus:border-b focus:border-amarea-cyan' : ''}" ${canEdit ? 'contenteditable="true"' : ''} data-index="${i}">${r.bio || r.vibe}</p>
      ${controls}
    `;
    residentsGrid.appendChild(div);
  });

  if (canEdit) {
    residentsGrid.querySelectorAll('.res-role, .res-bio').forEach(el => {
      el.addEventListener('blur', (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        if (e.target.classList.contains('res-role')) residents[i].role = e.target.textContent.trim();
        else residents[i].bio = e.target.textContent.trim();
        saveResidents();
      });
    });
    residentsGrid.querySelectorAll('.res-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        const dir = e.target.dataset.dir;
        const j = dir === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= residents.length) return;
        [residents[i], residents[j]] = [residents[j], residents[i]];
        saveResidents();
        renderResidents();
      });
    });
    residentsGrid.querySelectorAll('.res-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        if (confirm(tr('deleteResidentConfirm', '¿Eliminar este residente?'))) {
          residents.splice(i, 1);
          saveResidents();
          renderResidents();
        }
      });
    });
  }
}

// === EVENTS ===
function renderEvents() {
  const eventsList = document.getElementById('events-list');
  if (!eventsList) return;
  const now = new Date();
  eventsList.innerHTML = '';
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
}

// === CMS / CONTENT LOADER ===
let siteContent = JSON.parse(localStorage.getItem(STORAGE_CONTENT) || '{}');

function applySiteContent() {
  if (siteContent.residentes && Array.isArray(siteContent.residentes)) residents = siteContent.residentes;
  if (siteContent.eventos && Array.isArray(siteContent.eventos)) events = siteContent.eventos;
  if (siteContent.djNews && Array.isArray(siteContent.djNews)) djNews = siteContent.djNews;
  if (siteContent.caboNews && Array.isArray(siteContent.caboNews)) caboNews = siteContent.caboNews;
  if (siteContent.tracks && Array.isArray(siteContent.tracks)) { tracks = siteContent.tracks; renderTracks(); }
  if (siteContent.site && typeof siteContent.site === 'object') {
    if (siteContent.site.announcement) showAnnouncement(siteContent.site.announcement);
    if (siteContent.site.heroTitle) {
      const hero = document.querySelector('.hero-title');
      if (hero) hero.innerHTML = siteContent.site.heroTitle;
    }
  }
}

function showAnnouncement(text) {
  const bar = document.getElementById('announcement');
  const txt = document.getElementById('announcement-text');
  if (!bar || !txt) return;
  txt.textContent = text;
  bar.classList.remove('hidden');
}

function loadContent() {
  return new Promise((resolve) => {
    const url = GAS_LOG_URL();
    if (!url || !API_TOKEN) { resolve(); return; }
    const cb = 'amareaContent_' + Math.random().toString(36).slice(2, 9);
    const t = setTimeout(() => { delete window[cb]; resolve(); }, 6000);
    window[cb] = (content) => {
      clearTimeout(t);
      delete window[cb];
      if (content && typeof content === 'object') {
        siteContent = { ...siteContent, ...content };
        localStorage.setItem(STORAGE_CONTENT, JSON.stringify(siteContent));
        applySiteContent();
        renderResidents();
        renderEvents();
        renderRadar();
      }
      resolve();
    };
    const s = document.createElement('script');
    s.src = `${url}?callback=${cb}&view=content&token=${encodeURIComponent(API_TOKEN)}`;
    s.onerror = () => { delete window[cb]; resolve(); };
    document.head.appendChild(s);
  });
}

// === MINI MIXER ===
let mixerState = JSON.parse(localStorage.getItem(STORAGE_MIXER) || '{}');
let shuffle = mixerState.shuffle || false;
let autoplay = mixerState.autoplay || false;
let repeat = mixerState.repeat || false;
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
let autoDjInterval = null;
let autoDjTimer = null;
let autoDjSnippet = 0;
let previewEnd = 0;
let delayOn = false;
let crushOn = false;
let stutterOn = false;
let stutterTimer = null;
let stutterRate = 8;

function saveMixerState() {
  localStorage.setItem(STORAGE_MIXER, JSON.stringify({ shuffle, autoplay, repeat, skin: mixerSkin, eq }));
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
  if (!list) return;
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
      <div class="flex items-center gap-2">
        <button class="preview-btn text-[10px] font-display uppercase tracking-widest text-white/40 hover:text-amarea-cyan border border-white/10 px-2 py-1 rounded" data-preview="${i}">15s</button>
        <span class="text-2xl text-white/30">▶</span>
      </div>
    `;
    div.addEventListener('click', (e) => { if (e.target.closest('.preview-btn')) return; selectTrack(i); });
    div.querySelectorAll('.preview-btn').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); previewTrack(i); }));
    list.appendChild(div);
  });
  renderDeckSelects();
}

function previewTrack(index, seconds = 15) {
  if (!tracks[index]) return;
  previewEnd = seconds;
  selectTrack(index, true);
  audio.currentTime = 0;
}

function selectTrack(index, preview = false) {
  if (!tracks.length) return;
  if (!preview) previewEnd = 0;
  currentTrackIndex = index;
  const t = tracks[currentTrackIndex];
  audio.pause();
  audio.src = t.src;
  audio.loop = repeat;
  const ct = document.getElementById('current-track');
  const ca = document.getElementById('current-artist');
  if (ct) ct.textContent = t.title;
  if (ca) ca.textContent = t.artist;
  const da = document.getElementById('deck-a-title');
  if (da) da.textContent = t.title;
  renderTracks();
  document.getElementById('vinyl-hero')?.classList.remove('playing');
  if (autoplay || autoDj || preview) playAudio();
  loadWaveformFor('a', t.src);
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
  updateDeckAPlay();
  updateMiniPlayer();
}

function updateMiniPlayer() {
  const track = tracks[currentTrackIndex] || null;
  const title = document.getElementById('mini-title');
  const artist = document.getElementById('mini-artist');
  const play = document.getElementById('mini-play');
  if (title) title.textContent = track ? track.title : '—';
  if (artist) artist.textContent = track ? `${track.artist} · ${track.duration || '—'}` : tr('currentArtist', 'Selecciona un track');
  if (play) play.textContent = isPlaying ? '⏸' : '▶';
}

function updateMixerUI() {
  const mixer = document.getElementById('mini-mixer');
  if (mixer) mixer.dataset.skin = mixerSkin;
  document.getElementById('shuffle-btn')?.classList.toggle('active', shuffle);
  document.getElementById('autoplay-btn')?.classList.toggle('active', autoplay);
  document.getElementById('repeat-btn')?.classList.toggle('active', repeat);
  document.getElementById('autodj-btn')?.classList.toggle('active', autoDj);
  const skinLabel = document.getElementById('skin-label');
  if (skinLabel) skinLabel.textContent = `skin: ${mixerSkin} · autoplay: ${autoplay ? 'on' : 'off'} · repeat: ${repeat ? 'on' : 'off'} · auto-dj: ${autoDj ? 'on' : 'off'} · loop: ${loopOn ? 'on' : 'off'}`;
  ['bass','mid','treble'].forEach(k => {
    const el = document.getElementById('eq-' + k);
    if (el) el.value = eq[k];
    const val = document.getElementById('eq-' + k + '-val');
    if (val) val.textContent = eq[k];
  });
  const vol = document.getElementById('volume');
  if (vol) vol.value = masterVolume;
  const cf = document.getElementById('crossfader');
  if (cf) cf.value = crossValue;
  renderDeckSelects();
  updateVolumes();
  updateDelay();
  updateCrush();
  updateReverb();
  updateStutter(false);
  updateAutoDj();
  updateLoopUI();
}

function setEQ() {
  if (!lowGain || !midGain || !highGain || !audioCtx) return;
  lowGain.gain.setTargetAtTime(dbToGain(eq.bass), audioCtx.currentTime, 0.05);
  midGain.gain.setTargetAtTime(dbToGain(eq.mid), audioCtx.currentTime, 0.05);
  highGain.gain.setTargetAtTime(dbToGain(eq.treble), audioCtx.currentTime, 0.05);
}

function setSkin(skin) {
  mixerSkin = skin;
  updateMixerUI();
  saveMixerState();
}

document.getElementById('play-btn')?.addEventListener('click', togglePlay);
document.getElementById('next-btn')?.addEventListener('click', () => selectTrack(pickNextTrack()));
document.getElementById('prev-btn')?.addEventListener('click', () => selectTrack(pickPrevTrack()));
document.getElementById('shuffle-btn')?.addEventListener('click', () => { shuffle = !shuffle; updateMixerUI(); saveMixerState(); });
document.getElementById('autoplay-btn')?.addEventListener('click', () => { autoplay = !autoplay; updateMixerUI(); saveMixerState(); });
document.getElementById('repeat-btn')?.addEventListener('click', () => { repeat = !repeat; if (audio) audio.loop = repeat; updateMixerUI(); saveMixerState(); });
document.getElementById('autodj-btn')?.addEventListener('click', toggleAutoDj);
document.querySelectorAll('.skin-btn').forEach(b => b.addEventListener('click', () => setSkin(b.dataset.skin)));

document.getElementById('volume')?.addEventListener('input', (e) => {
  masterVolume = parseFloat(e.target.value);
  updateVolumes();
});

['bass','mid','treble'].forEach(k => {
  const el = document.getElementById('eq-' + k);
  if (!el) return;
  el.addEventListener('input', (e) => {
    eq[k] = parseInt(e.target.value, 10);
    const val = document.getElementById('eq-' + k + '-val');
    if (val) val.textContent = eq[k];
    setEQ(); saveMixerState();
  });
});

audio.addEventListener('ended', () => {
  if (autoDj) {
    autoDjTransition = false;
    selectTrack(pickNextTrack());
    if (djFilter) {
      djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 1);
      djFilter.Q.setTargetAtTime(0, audioCtx.currentTime, 0.5);
    }
    return;
  }
  if (repeat) { audio.currentTime = 0; playAudio(); return; }
  if (!autoplay) return;
  selectTrack(pickNextTrack());
});

audio.addEventListener('timeupdate', () => {
  const progress = document.getElementById('progress');
  if (audio.duration) {
    if (progress) progress.value = (audio.currentTime / audio.duration) * 100;
    const tc = document.getElementById('time-current');
    if (tc) tc.textContent = formatTime(audio.currentTime);
    const tt = document.getElementById('time-total');
    if (tt) tt.textContent = formatTime(audio.duration);
    const da = document.getElementById('deck-a-time');
    if (da) da.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
  }
  if (loopOn && audio.currentTime >= loopEnd) {
    audio.currentTime = loopStart;
  }
  drawWaveformFor('a');
  if (previewEnd && audio.currentTime >= previewEnd) {
    pauseAudio();
    previewEnd = 0;
  }
  if (autoDj && audio.duration && !autoDjTransition && audio.currentTime >= autoDjSnippet) {
    autoDjTransition = true;
    performAutoDjTransition();
  }
});

audio.addEventListener('loadedmetadata', () => {
  const tt = document.getElementById('time-total');
  if (tt) tt.textContent = formatTime(audio.duration);
  const da = document.getElementById('deck-a-time');
  if (da) da.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
  if (!currentBufferA && audio.src) loadWaveformFor('a', audio.src);
});

deckB.addEventListener('loadedmetadata', () => {
  const dt = document.getElementById('deck-b-time');
  if (dt) dt.textContent = formatTime(deckB.currentTime) + ' / ' + formatTime(deckB.duration);
});

deckB.addEventListener('timeupdate', () => {
  const dt = document.getElementById('deck-b-time');
  if (dt) dt.textContent = formatTime(deckB.currentTime) + ' / ' + formatTime(deckB.duration);
  drawWaveformFor('b');
});

deckB.addEventListener('ended', () => { deckBPlaying = false; updateDeckBPlay(); });

document.getElementById('progress')?.addEventListener('input', (e) => {
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

function makeReverbImpulse(duration = 2.5, decay = 2.5) {
  if (!audioCtx) return null;
  const sr = audioCtx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = audioCtx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

function dbToGain(db) {
  if (db <= -30) return 0;
  return Math.max(0, Math.pow(10, db / 20));
}

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.85;

  source = audioCtx.createMediaElementSource(audio);
  sourceB = audioCtx.createMediaElementSource(deckB);

  crossGainA = audioCtx.createGain();
  crossGainB = audioCtx.createGain();
  source.connect(crossGainA);
  sourceB.connect(crossGainB);

  bassFilter = audioCtx.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.value = 250;
  bassFilter.Q.value = 0.707;

  midLowFilter = audioCtx.createBiquadFilter();
  midLowFilter.type = 'lowpass';
  midLowFilter.frequency.value = 2500;
  midLowFilter.Q.value = 0.707;

  midHighFilter = audioCtx.createBiquadFilter();
  midHighFilter.type = 'highpass';
  midHighFilter.frequency.value = 250;
  midHighFilter.Q.value = 0.707;

  trebleFilter = audioCtx.createBiquadFilter();
  trebleFilter.type = 'highpass';
  trebleFilter.frequency.value = 2500;
  trebleFilter.Q.value = 0.707;

  lowGain = audioCtx.createGain();
  midGain = audioCtx.createGain();
  highGain = audioCtx.createGain();

  crossGainA.connect(bassFilter);
  crossGainB.connect(bassFilter);
  crossGainA.connect(midLowFilter);
  crossGainB.connect(midLowFilter);
  crossGainA.connect(trebleFilter);
  crossGainB.connect(trebleFilter);

  bassFilter.connect(lowGain);
  midLowFilter.connect(midHighFilter);
  midHighFilter.connect(midGain);
  trebleFilter.connect(highGain);

  masterGain = audioCtx.createGain();
  masterGain.gain.value = masterVolume;
  lowGain.connect(masterGain);
  midGain.connect(masterGain);
  highGain.connect(masterGain);

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

  reverbNode = audioCtx.createConvolver();
  reverbNode.buffer = makeReverbImpulse(2.5, 2.5);
  reverbWet = audioCtx.createGain();
  reverbWet.gain.value = 0;

  flangerDelay = audioCtx.createDelay(0.05);
  flangerDelay.delayTime.value = 0.005;
  lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.5;
  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.003;
  lfo.connect(lfoGain);
  lfoGain.connect(flangerDelay.delayTime);
  lfo.start();
  flangerFeedback = audioCtx.createGain();
  flangerFeedback.gain.value = 0.5;
  flangerMix = audioCtx.createGain();
  flangerMix.gain.value = 0;

  dryGain = audioCtx.createGain();
  dryGain.gain.value = 1;
  crushWet = audioCtx.createGain();
  crushWet.gain.value = 0;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;

  masterGain.connect(djFilter);
  masterGain.connect(reverbNode);

  djFilter.connect(dryGain);
  djFilter.connect(bitcrusherNode);
  bitcrusherNode.connect(crushWet);

  djFilter.connect(delayInput);
  delayInput.connect(delayNode);
  delayNode.connect(feedbackNode);
  feedbackNode.connect(delayInput);
  delayNode.connect(delayWet);

  reverbNode.connect(reverbWet);

  djFilter.connect(flangerDelay);
  flangerDelay.connect(flangerFeedback);
  flangerFeedback.connect(flangerDelay);
  flangerDelay.connect(flangerMix);
  flangerMix.connect(gainNode);

  dryGain.connect(gainNode);
  crushWet.connect(gainNode);
  delayWet.connect(gainNode);
  reverbWet.connect(gainNode);

  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  setEQ();
  updateVolumes();
  updateDelay();
  updateCrush();
  updateReverb();
  updateMixerUI();
  drawVisualizer();
  startVisRotation();
}

function drawVisualizer() {
  if (!analyser || !ctx || !canvas) return;
  const bufferLength = analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  const timeData = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(data);
  analyser.getByteTimeDomainData(timeData);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  visHueShift = (visHueShift + 0.25) % 360;
  drawVisMode(visMode, data, timeData, bufferLength);
  animationId = requestAnimationFrame(drawVisualizer);
}

function drawVisMode(mode, data, timeData, bufferLength) {
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const w = canvas.width, h = canvas.height;
  const avg = data.reduce((a, b) => a + b, 0) / bufferLength / 255;

  if (mode === 'circles') {
    const maxR = Math.min(cx, cy) - 8;
    const bands = 64;
    const step = Math.floor(bufferLength / bands);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < bands; i++) {
      const v = data[i * step] || 0;
      const norm = v / 255;
      const base = 8 + (i / bands) * (maxR - 8);
      const r = base + norm * 26;
      const hue = (visHueShift + (i / bands) * 140) % 360;
      const alpha = 0.12 + norm * 0.78;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsla(${hue}, 90%, 60%, ${norm})`;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  } else if (mode === 'bars') {
    const bars = 64;
    const step = Math.floor(bufferLength / bars);
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] || 0;
      const bh = (v / 255) * h * 0.95;
      const hue = (visHueShift + (i / bars) * 160) % 360;
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${0.6 + (v / 255) * 0.4})`;
      ctx.fillRect(i * bw, h - bh, bw - 1, bh);
    }
  } else if (mode === 'wave') {
    ctx.lineWidth = 2;
    ctx.beginPath();
    const slice = w / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128 - 1;
      const y = cy + v * cy * 0.95;
      if (i === 0) ctx.moveTo(i * slice, y);
      else ctx.lineTo(i * slice, y);
    }
    ctx.strokeStyle = `hsla(${(visHueShift + 180) % 360}, 90%, 60%, 0.9)`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `hsla(${(visHueShift + 180) % 360}, 90%, 60%, 0.6)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (mode === 'spiral') {
    const arms = 3, turns = 2.5, maxR = Math.min(cx, cy) - 6;
    ctx.lineWidth = 1.5;
    for (let a = 0; a < arms; a++) {
      const baseAngle = (a / arms) * Math.PI * 2 + visHueShift * 0.01;
      ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const t = i / 119;
        const v = data[Math.floor(t * (bufferLength - 1))] || 0;
        const r = 6 + t * maxR + (v / 255) * 20;
        const angle = baseAngle + t * Math.PI * 2 * turns;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${(visHueShift + a * 70) % 360}, 90%, 60%, 0.8)`;
      ctx.stroke();
    }
  } else if (mode === 'grid') {
    const cols = 12, rows = 6;
    const cw = w / cols, rh = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = Math.floor((y * cols + x) / (cols * rows) * (bufferLength - 1));
        const v = data[i] || 0;
        const norm = v / 255;
        const hue = (visHueShift + norm * 120 + (x + y) * 15) % 360;
        ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${0.1 + norm * 0.8})`;
        const size = Math.max(2, norm * Math.min(cw, rh) * 0.9);
        ctx.fillRect(x * cw + (cw - size) / 2, y * rh + (rh - size) / 2, size, size);
      }
    }
  } else if (mode === 'particles') {
    const particles = 40;
    for (let i = 0; i < particles; i++) {
      const v = data[Math.floor(i / particles * (bufferLength - 1))] || 0;
      const norm = v / 255;
      const angle = (i / particles) * Math.PI * 2 + visHueShift * 0.02;
      const r = 20 + norm * (Math.min(cx, cy) - 20);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const hue = (visHueShift + i * 9) % 360;
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${0.4 + norm * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + norm * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mode === 'nebula') {
    const blobs = 6;
    for (let i = 0; i < blobs; i++) {
      const v = data[Math.floor(i / blobs * (bufferLength - 1))] || 0;
      const norm = v / 255;
      const angle = (i / blobs) * Math.PI * 2 + visHueShift * 0.01;
      const r = 40 + norm * (Math.min(cx, cy) - 40);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const hue = (visHueShift + i * 60) % 360;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + norm * 60);
      g.addColorStop(0, `hsla(${hue}, 90%, 60%, ${0.5 + norm * 0.5})`);
      g.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 30 + norm * 60, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mode === 'scope') {
    const r = Math.min(cx, cy) - 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const t = i / bufferLength;
      const v = timeData[i] / 128 - 1;
      const rr = r + v * r * 0.4;
      const a = t * Math.PI * 2;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${(visHueShift + 300) % 360}, 90%, 60%, 0.9)`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${(visHueShift + 300) % 360}, 90%, 60%, 0.5)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function nextVisMode() {
  const choices = VISUALIZER_MODES.filter(m => m !== visMode);
  visMode = choices[Math.floor(Math.random() * choices.length)];
  visHueShift = Math.random() * 360;
  const delay = 12000 + Math.random() * 12000;
  if (visModeTimer) clearTimeout(visModeTimer);
  visModeTimer = setTimeout(nextVisMode, delay);
}

function startVisRotation() {
  if (visModeTimer) clearTimeout(visModeTimer);
  nextVisMode();
}

function updateDelay() {
  if (!delayNode || !delayWet || !feedbackNode || !dryGain || !audioCtx) return;
  const time = parseFloat(document.getElementById('delay-time')?.value || 0.3);
  const feedback = parseFloat(document.getElementById('delay-feedback')?.value || 0.4);
  const mix = parseFloat(document.getElementById('delay-mix')?.value || 0.5);
  delayNode.delayTime.setTargetAtTime(time, audioCtx.currentTime, 0.05);
  feedbackNode.gain.setTargetAtTime(delayOn ? feedback : 0, audioCtx.currentTime, 0.05);
  delayWet.gain.setTargetAtTime(delayOn ? mix : 0, audioCtx.currentTime, 0.05);
  updateDry();
  const timeVal = document.getElementById('delay-time-val');
  if (timeVal) timeVal.textContent = time.toFixed(2) + 's';
  const fbVal = document.getElementById('delay-feedback-val');
  if (fbVal) fbVal.textContent = Math.round(feedback * 100) + '%';
  const mixVal = document.getElementById('delay-mix-val');
  if (mixVal) mixVal.textContent = Math.round(mix * 100) + '%';
  const btn = document.getElementById('fx-delay');
  if (btn) btn.classList.toggle('active', delayOn);
}

function updateCrush() {
  if (!bitcrusherNode || !crushWet || !dryGain || !audioCtx) return;
  const bits = parseInt(document.getElementById('crush-bits')?.value || 8, 10);
  const mix = parseFloat(document.getElementById('crush-mix')?.value || 0.6);
  bitcrusherNode.curve = makeCrushCurve(bits);
  crushWet.gain.setTargetAtTime(crushOn ? mix : 0, audioCtx.currentTime, 0.05);
  updateDry();
  const bitsVal = document.getElementById('crush-bits-val');
  if (bitsVal) bitsVal.textContent = bits;
  const mixVal = document.getElementById('crush-mix-val');
  if (mixVal) mixVal.textContent = Math.round(mix * 100) + '%';
  const btn = document.getElementById('fx-crush');
  if (btn) btn.classList.toggle('active', crushOn);
}

function startStutter() {
  if (stutterTimer) clearInterval(stutterTimer);
  stutterTimer = setInterval(() => {
    if (!stutterOn || !isPlaying || !gainNode || !audioCtx) return;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.setTargetAtTime(1, audioCtx.currentTime + 0.02, 0.03);
  }, 1000 / stutterRate);
}

function stopStutter() {
  if (stutterTimer) { clearInterval(stutterTimer); stutterTimer = null; }
  if (gainNode && audioCtx) gainNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.05);
}

function updateStutter(updateTimer = true) {
  stutterRate = parseInt(document.getElementById('stutter-rate')?.value || 8, 10);
  const rateVal = document.getElementById('stutter-rate-val');
  if (rateVal) rateVal.textContent = stutterRate + ' Hz';
  const btn = document.getElementById('fx-stutter');
  if (btn) btn.classList.toggle('active', stutterOn);
  if (updateTimer) {
    stopStutter();
    if (stutterOn) startStutter();
  }
}

function resetMixer() {
  eq = { bass: 0, mid: 0, treble: 0 };
  shuffle = false; autoplay = false; repeat = false;
  mixerSkin = 'dark';
  masterVolume = 1;
  crossValue = 0;
  audio.volume = 1;
  deckB.volume = 1;
  pitchA = 1; pitchB = 1;
  setPitch('a', 1); setPitch('b', 1);
  delayOn = false; crushOn = false; stutterOn = false; autoDj = false; reverbOn = false;
  stopAutoDj(); stopStutter();
  if (audio) audio.loop = false;
  clearLoop();
  if (djFilter && audioCtx) {
    djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 0.1);
    djFilter.Q.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  }
  if (lfo && audioCtx) lfo.frequency.setTargetAtTime(0.5, audioCtx.currentTime, 0.1);
  if (flangerMix && audioCtx) flangerMix.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.05);
  saveMixerState();
  updateMixerUI();
}

function updateDry() {
  if (!dryGain || !audioCtx) return;
  const d = delayOn ? parseFloat(document.getElementById('delay-mix')?.value || 0.5) : 0;
  const c = crushOn ? parseFloat(document.getElementById('crush-mix')?.value || 0.6) : 0;
  const r = reverbOn ? parseFloat(document.getElementById('reverb-mix')?.value || 0.3) : 0;
  const wet = Math.min(1.2, d + c + r);
  dryGain.gain.setTargetAtTime(Math.max(0.15, 1 - wet * 0.45), audioCtx.currentTime, 0.05);
}

function updateReverb() {
  if (!reverbWet || !audioCtx) return;
  const mix = parseFloat(document.getElementById('reverb-mix')?.value || 0.3);
  reverbWet.gain.setTargetAtTime(reverbOn ? mix : 0, audioCtx.currentTime, 0.05);
  updateDry();
  const val = document.getElementById('reverb-mix-val');
  if (val) val.textContent = Math.round(mix * 100) + '%';
  const btn = document.getElementById('fx-reverb');
  if (btn) btn.classList.toggle('active', reverbOn);
}

function stopAutoDj() {
  if (autoDjTimer) { clearTimeout(autoDjTimer); autoDjTimer = null; }
  if (autoDjInterval) { clearInterval(autoDjInterval); autoDjInterval = null; }
  autoDjTransition = false;
  autoDjSnippet = 0;
}

function autoDjGate(steps, ms) {
  if (!gainNode || !audioCtx) return;
  const t = audioCtx.currentTime;
  const step = ms / 1000;
  for (let i = 0; i < steps * 2; i++) {
    gainNode.gain.setValueAtTime(i % 2 ? 0.18 : 1, t + i * step);
  }
  gainNode.gain.setTargetAtTime(1, t + steps * 2 * step, 0.05);
}

function scheduleAutoDjEffect() {
  if (!autoDj || !isPlaying || !djFilter || !audioCtx) return;
  const now = audioCtx.currentTime;
  const r = Math.random();
  if (r < 0.22) {
    const f = 300 + Math.random() * 15000;
    djFilter.frequency.setTargetAtTime(f, now, 0.12 + Math.random() * 0.25);
    setTimeout(() => { if (djFilter) { djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 0.8); djFilter.Q.setTargetAtTime(0, audioCtx.currentTime, 0.5); } }, 500 + Math.random() * 1000);
  } else if (r < 0.42) {
    const rate = [0.5, 0.75, 1.25, 1.5][Math.floor(Math.random() * 4)];
    audio.playbackRate = rate;
    setTimeout(() => { if (audio) audio.playbackRate = 1; }, 80 + Math.random() * 400);
  } else if (r < 0.62) {
    autoDjGate(4 + Math.floor(Math.random() * 6), 60 + Math.floor(Math.random() * 100));
  } else if (r < 0.82) {
    if (delayWet) delayWet.gain.setTargetAtTime(0.5 + Math.random() * 0.3, now, 0.05);
    setTimeout(() => { if (delayWet) delayWet.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08); }, 400 + Math.random() * 700);
  } else {
    if (bitcrusherNode && crushWet) {
      bitcrusherNode.curve = makeCrushCurve(2 + Math.floor(Math.random() * 6));
      crushWet.gain.setTargetAtTime(0.5, now, 0.05);
      setTimeout(() => { if (crushWet) crushWet.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08); }, 300 + Math.random() * 600);
    }
  }
  autoDjTimer = setTimeout(scheduleAutoDjEffect, 900 + Math.random() * 1800);
}

function performAutoDjTransition() {
  if (!djFilter || !audioCtx) return;
  djFilter.Q.setTargetAtTime(12, audioCtx.currentTime, 0.1);
  djFilter.frequency.setTargetAtTime(180, audioCtx.currentTime, 0.2);
  autoDjGate(3, 120);
  setTimeout(() => {
    if (!audio) return;
    selectTrack(pickNextTrack());
    if (djFilter) { djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 1.2); djFilter.Q.setTargetAtTime(0, audioCtx.currentTime, 0.8); }
    autoDjTransition = false;
    autoDjSnippet = 15 + Math.random() * 20;
  }, 1400);
}

function startAutoDj() {
  if (autoDjInterval) return;
  autoDjSnippet = 15 + Math.random() * 20;
  autoDjInterval = setInterval(() => {
    if (!autoDj || !isPlaying || !djFilter || !audioCtx) return;
    if (Math.random() > 0.5) {
      const f = 400 + Math.random() * 14000;
      djFilter.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.12 + Math.random() * 0.25);
      setTimeout(() => { if (djFilter) djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 0.8); }, 350 + Math.random() * 600);
    }
  }, 1200);
  scheduleAutoDjEffect();
}

function updateAutoDj() {
  const btn = document.getElementById('autodj-btn');
  if (btn) btn.classList.toggle('active', autoDj);
}

function toggleAutoDj() {
  autoDj = !autoDj;
  updateAutoDj();
  if (autoDj) {
    if (currentTrackIndex < 0) selectTrack(0);
    else if (!isPlaying) playAudio();
    startAutoDj();
  } else {
    stopAutoDj();
    if (audio) audio.playbackRate = 1;
    if (djFilter && audioCtx) {
      djFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 0.5);
      djFilter.Q.setTargetAtTime(0, audioCtx.currentTime, 0.5);
    }
  }
}

function setXY(x, y) {
  if (!djFilter || !audio || !audioCtx) return;
  const minF = 200, maxF = 20000;
  const freq = minF * Math.pow(maxF / minF, Math.max(0, Math.min(1, x)));
  djFilter.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
  if (lfo && flangerMix) {
    lfo.frequency.setTargetAtTime(0.1 + Math.max(0, Math.min(1, y)) * 4.9, audioCtx.currentTime, 0.05);
    flangerMix.gain.setTargetAtTime(Math.max(0, Math.min(1, y)) * 0.6, audioCtx.currentTime, 0.05);
  }
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

document.getElementById('close-announcement')?.addEventListener('click', () => { document.getElementById('announcement')?.classList.add('hidden'); });
document.getElementById('fx-delay')?.addEventListener('click', () => { delayOn = !delayOn; updateDelay(); });
document.getElementById('fx-reverb')?.addEventListener('click', () => { reverbOn = !reverbOn; updateReverb(); });
document.getElementById('fx-crush')?.addEventListener('click', () => { crushOn = !crushOn; updateCrush(); });
document.getElementById('fx-stutter')?.addEventListener('click', () => { stutterOn = !stutterOn; updateStutter(); });
document.getElementById('delay-time')?.addEventListener('input', updateDelay);
document.getElementById('delay-feedback')?.addEventListener('input', updateDelay);
document.getElementById('delay-mix')?.addEventListener('input', updateDelay);
document.getElementById('reverb-mix')?.addEventListener('input', updateReverb);
document.getElementById('crush-bits')?.addEventListener('input', updateCrush);
document.getElementById('crush-mix')?.addEventListener('input', updateCrush);
document.getElementById('stutter-rate')?.addEventListener('input', updateStutter);
document.getElementById('reset-mixer')?.addEventListener('click', resetMixer);

bindWaveform('a', 'waveform-a');
bindWaveform('b', 'waveform-b');

['a', 'b'].forEach(deck => {
  const el = document.getElementById('pitch-' + deck);
  if (el) el.addEventListener('input', (e) => setPitch(deck, parseFloat(e.target.value)));
});

document.getElementById('deck-a-cue')?.addEventListener('click', () => jumpToCue('a'));
document.getElementById('deck-b-cue')?.addEventListener('click', () => jumpToCue('b'));

document.getElementById('loop-exit')?.addEventListener('click', exitLoop);
document.getElementById('beat-sync')?.addEventListener('click', beatSync);

bindDjPad();

document.getElementById('dj-mode-btn')?.addEventListener('click', () => {
  document.getElementById('dj-console')?.classList.toggle('hidden');
});

document.getElementById('upload-tracks-btn')?.addEventListener('click', () => {
  document.getElementById('upload-tracks')?.click();
});

document.getElementById('upload-tracks')?.addEventListener('change', (e) => {
  handleUpload(e.target.files);
  e.target.value = '';
});

document.getElementById('clear-local-tracks')?.addEventListener('click', clearLocalTracks);

document.getElementById('deck-a-select')?.addEventListener('change', (e) => {
  const idx = parseInt(e.target.value, 10);
  if (!isNaN(idx) && tracks[idx]) selectDeckA(idx);
});

document.getElementById('deck-a-file-btn')?.addEventListener('click', () => {
  document.getElementById('deck-a-file')?.click();
});

document.getElementById('deck-a-file')?.addEventListener('change', (e) => {
  if (e.target.files[0]) loadDeckAFile(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('deck-a-play')?.addEventListener('click', toggleDeckA);

document.getElementById('deck-b-select')?.addEventListener('change', (e) => {
  const idx = parseInt(e.target.value, 10);
  if (!isNaN(idx) && tracks[idx]) selectDeckB(idx);
});

document.getElementById('deck-b-file-btn')?.addEventListener('click', () => {
  document.getElementById('deck-b-file')?.click();
});

document.getElementById('deck-b-file')?.addEventListener('change', (e) => {
  if (e.target.files[0]) loadDeckBFile(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('deck-b-play')?.addEventListener('click', toggleDeckB);

document.getElementById('crossfader')?.addEventListener('input', (e) => {
  crossValue = parseFloat(e.target.value);
  updateVolumes();
});

document.getElementById('waveform-zoom')?.addEventListener('input', (e) => {
  waveformZoom = Math.max(1, parseFloat(e.target.value));
  const z = document.getElementById('waveform-zoom-val');
  if (z) z.textContent = waveformZoom.toFixed(1) + 'x';
  drawWaveformFor('a');
  drawWaveformFor('b');
});

document.querySelectorAll('.loop-bar-btn').forEach(b => b.addEventListener('click', () => {
  setLoop(parseInt(b.dataset.bars, 10));
}));

document.getElementById('loop-clear')?.addEventListener('click', clearLoop);

document.getElementById('loop-bpm')?.addEventListener('input', (e) => {
  loopBpm = Math.max(60, Math.min(200, parseInt(e.target.value, 10) || 128));
});

function updateVolumes() {
  if (!crossGainA || !crossGainB || !masterGain || !audioCtx) return;
  crossGainA.gain.setTargetAtTime(Math.max(0, 1 - crossValue), audioCtx.currentTime, 0.02);
  crossGainB.gain.setTargetAtTime(Math.max(0, crossValue), audioCtx.currentTime, 0.02);
  masterGain.gain.setTargetAtTime(Math.max(0, masterVolume), audioCtx.currentTime, 0.02);
  const volVal = document.getElementById('volume-val');
  if (volVal) volVal.textContent = Math.round(masterVolume * 100) + '%';
}

function handleUpload(files) {
  if (!files || !files.length) return;
  const nextIndex = tracks.length;
  for (const f of files) {
    const title = f.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(f);
    const t = { title, artist: 'Local', src: url, duration: '—', local: true };
    tracks.push(t);
    localTracks.push(t);
  }
  renderTracks();
  const btn = document.getElementById('clear-local-tracks');
  if (btn) btn.classList.remove('hidden');
  if (nextIndex === 0) selectTrack(0);
  logToSheet('local_upload', { count: files.length });
}

function clearLocalTracks() {
  const removed = tracks.filter(t => t.local).length;
  tracks = tracks.filter(t => !t.local);
  localTracks.forEach(t => { try { URL.revokeObjectURL(t.src); } catch (e) {} });
  localTracks = [];
  if (currentTrackIndex >= tracks.length) { currentTrackIndex = -1; audio.pause(); }
  renderTracks();
  const btn = document.getElementById('clear-local-tracks');
  if (btn) btn.classList.add('hidden');
  logToSheet('local_clear', { removed });
}

function renderDeckSelects() {
  const aSel = document.getElementById('deck-a-select');
  const bSel = document.getElementById('deck-b-select');
  if (!aSel || !bSel) return;
  const aVal = aSel.value, bVal = bSel.value;
  const opts = tracks.map((t, i) => `<option value="${i}">${t.title}</option>`).join('');
  aSel.innerHTML = '<option value="">— track —</option>' + opts;
  bSel.innerHTML = '<option value="">— track —</option>' + opts;
  aSel.value = aVal;
  bSel.value = bVal;
}

function selectDeckA(index) {
  if (!tracks[index]) return;
  currentTrackIndex = index;
  selectTrack(index);
}

function loadDeckAFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (audio.src && audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
  audio.src = url;
  audio.load();
  const title = file.name.replace(/\.[^.]+$/, '');
  document.getElementById('deck-a-title') && (document.getElementById('deck-a-title').textContent = title);
  document.getElementById('current-track') && (document.getElementById('current-track').textContent = title);
  document.getElementById('current-artist') && (document.getElementById('current-artist').textContent = 'Local');
  loadWaveformFor('a', url);
  logToSheet('deck_a_file', { title });
}

function toggleDeckA() {
  if (!audio.src) { if (tracks.length) selectTrack(0); return; }
  if (isPlaying) pauseAudio();
  else playAudio();
}

function updateDeckAPlay() {
  const b = document.getElementById('deck-a-play');
  if (b) b.textContent = isPlaying ? '⏸' : '▶';
}

function selectDeckB(index) {
  const t = tracks[index];
  if (!t) return;
  deckB.src = t.src;
  deckBTitle = t.title;
  const el = document.getElementById('deck-b-title');
  if (el) el.textContent = deckBTitle;
  deckB.load();
  loadWaveformFor('b', t.src);
  logToSheet('deck_b_track', { title: t.title });
}

function loadDeckBFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (deckB.src && deckB.src.startsWith('blob:')) URL.revokeObjectURL(deckB.src);
  deckB.src = url;
  deckBTitle = file.name.replace(/\.[^.]+$/, '');
  const t = document.getElementById('deck-b-title');
  if (t) t.textContent = deckBTitle;
  deckB.load();
  loadWaveformFor('b', url);
  logToSheet('deck_b_file', { title: deckBTitle });
}

function updateDeckBPlay() {
  const b = document.getElementById('deck-b-play');
  if (b) b.textContent = deckB.paused ? '▶' : '⏸';
}

function toggleDeckB() {
  if (!deckB.src) return;
  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (deckB.paused) {
    deckB.play().then(() => { deckBPlaying = true; updateDeckBPlay(); }).catch(() => {});
  } else {
    deckB.pause();
    deckBPlaying = false;
    updateDeckBPlay();
  }
}

async function loadWaveformFor(deck, src) {
  if (!src) return;
  try {
    const r = await fetch(src);
    if (!r.ok) return;
    const ab = await r.arrayBuffer();
    const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const buf = await ctx.decodeAudioData(ab);
    if (deck === 'a') currentBufferA = buf; else currentBufferB = buf;
    drawWaveformFor(deck);
    if (!audioCtx && ctx.close) ctx.close();
  } catch (e) {
    if (deck === 'a') currentBufferA = null; else currentBufferB = null;
  }
}

function drawWaveformFor(deck) {
  const canvas = deck === 'a' ? (waveformACanvas || (waveformACanvas = document.getElementById('waveform-a'))) : (waveformBCanvas || (waveformBCanvas = document.getElementById('waveform-b')));
  if (!canvas) return;
  const context = deck === 'a' ? (waveformACtx || (waveformACtx = canvas.getContext('2d'))) : (waveformBCtx || (waveformBCtx = canvas.getContext('2d')));
  const buffer = deck === 'a' ? currentBufferA : currentBufferB;
  const a = deck === 'a' ? audio : deckB;
  if (!buffer || !context || !a) return;
  const w = canvas.width, h = canvas.height;
  if (!w || !h) return;
  context.clearRect(0, 0, w, h);
  const duration = buffer.duration;
  const data = buffer.getChannelData(0);
  const view = Math.max(2, duration / waveformZoom);
  const center = Math.max(0, Math.min(duration, a.currentTime || 0));
  let start = Math.max(0, center - view / 2);
  if (start + view > duration) start = Math.max(0, duration - view);
  const end = Math.min(duration, start + view);
  const samples = data.length;
  const startSample = Math.floor(start / duration * samples);
  const endSample = Math.floor(end / duration * samples);
  const range = Math.max(1, endSample - startSample);
  context.lineWidth = 1;
  const hue = deck === 'a' ? 180 : 330;
  for (let x = 0; x < w; x++) {
    const s0 = startSample + Math.floor(x * range / w);
    const s1 = startSample + Math.floor((x + 1) * range / w);
    let min = 0, max = 0;
    for (let s = s0; s < s1; s++) {
      if (s >= samples) break;
      const v = data[s];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y0 = (1 - max) * h / 2;
    const y1 = (1 - min) * h / 2;
    context.strokeStyle = `hsla(${hue + (x / w) * 60}, 90%, 60%, 0.85)`;
    context.beginPath();
    context.moveTo(x, y0);
    context.lineTo(x, y1);
    context.stroke();
  }
  const headX = (center - start) / view * w;
  context.strokeStyle = deck === 'a' ? '#00f0ff' : '#ff006e';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(headX, 0);
  context.lineTo(headX, h);
  context.stroke();
  const cueTime = deck === 'a' ? cueA : cueB;
  if (cueTime >= 0 && cueTime >= start && cueTime <= end) {
    const cueX = (cueTime - start) / view * w;
    context.strokeStyle = '#f2c94c';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cueX, 0);
    context.lineTo(cueX, h);
    context.stroke();
  }
  const label = document.getElementById('waveform-' + deck + '-label');
  if (label) label.textContent = waveformZoom.toFixed(1) + 'x';
}

function getWaveformView(deck) {
  const buffer = deck === 'a' ? currentBufferA : currentBufferB;
  const a = deck === 'a' ? audio : deckB;
  if (!buffer || !a) return null;
  const duration = buffer.duration;
  const center = Math.max(0, Math.min(duration, a.currentTime || 0));
  const view = Math.max(2, duration / waveformZoom);
  let start = Math.max(0, center - view / 2);
  if (start + view > duration) start = Math.max(0, duration - view);
  return { duration, center, view, start };
}

function getWaveformTimeAtX(deck, canvas, clientX) {
  const viewData = getWaveformView(deck);
  if (!viewData || !canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return viewData.start + x * viewData.view;
}

function bindWaveform(deck, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const media = deck === 'a' ? audio : deckB;
  const isPlayingFlag = () => deck === 'a' ? isPlaying : deckBPlaying;
  const setPlaying = (v) => { if (deck === 'a') isPlaying = v; else deckBPlaying = v; };
  const scrubbingFlag = () => deck === 'a' ? isScrubbingA : isScrubbingB;
  const setScrubbing = (v) => { if (deck === 'a') isScrubbingA = v; else isScrubbingB = v; };
  const wasPlayingFlag = () => deck === 'a' ? wasPlayingA : wasPlayingB;
  const setWasPlaying = (v) => { if (deck === 'a') wasPlayingA = v; else wasPlayingB = v; };

  const updateTime = (clientX, isCue) => {
    if (isCue) {
      const t = getWaveformTimeAtX(deck, canvas, clientX);
      if (t == null) return;
      if (deck === 'a') cueA = t; else cueB = t;
      drawWaveformFor(deck);
      return;
    }
    if (!scrubbingFlag()) return;
    const t = getWaveformTimeAtX(deck, canvas, clientX);
    if (t == null) return;
    if (media && media.duration) {
      media.currentTime = Math.max(0, Math.min(media.duration, t));
    }
  };

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const isCue = e.button === 2 || e.ctrlKey || e.metaKey;
    if (isCue) {
      updateTime(e.clientX, true);
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    setScrubbing(true);
    setWasPlaying(isPlayingFlag() && !media.paused);
    if (!media.paused) media.pause();
    updateTime(e.clientX, false);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (scrubbingFlag() && (e.buttons & 1)) updateTime(e.clientX, false);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (scrubbingFlag()) {
      setScrubbing(false);
      if (wasPlayingFlag()) media.play().then(() => setPlaying(true)).catch(() => {});
    }
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointerleave', (e) => {
    if (scrubbingFlag()) {
      setScrubbing(false);
      if (wasPlayingFlag()) media.play().then(() => setPlaying(true)).catch(() => {});
    }
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  });

  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); });
}

function jumpToCue(deck) {
  const media = deck === 'a' ? audio : deckB;
  const cue = deck === 'a' ? cueA : cueB;
  if (!media || cue < 0 || !media.duration) return;
  media.currentTime = Math.max(0, Math.min(media.duration, cue));
}

function exitLoop() {
  loopOn = false;
  updateLoopUI();
}

function beatSync() {
  if (!audio || !audio.duration || !deckB || !deckB.duration || !loopBpm) return;
  const beatDur = 60 / Math.max(60, loopBpm);
  const aNextBeat = audio.currentTime + (beatDur - (audio.currentTime % beatDur));
  const bPhase = deckB.currentTime % beatDur;
  deckB.currentTime = Math.max(0, aNextBeat - bPhase);
}

function setPitch(deck, value) {
  const media = deck === 'a' ? audio : deckB;
  if (!media) return;
  if (deck === 'a') pitchA = value; else pitchB = value;
  if (typeof media.preservesPitch !== 'undefined') media.preservesPitch = false;
  media.playbackRate = value;
  const label = document.getElementById('pitch-' + deck + '-val');
  if (label) label.textContent = ((value - 1) * 100).toFixed(0) + '%';
}

function setLoop(bars) {
  if (!audio || !audio.duration || !isPlaying) return;
  loopBpm = Math.max(60, Math.min(200, parseInt(document.getElementById('loop-bpm')?.value, 10) || 128));
  const seconds = bars * 4 * (60 / loopBpm);
  loopStart = audio.currentTime;
  loopEnd = Math.min(audio.duration, loopStart + seconds);
  loopOn = true;
  updateLoopUI();
  logToSheet('loop', { bars, bpm: loopBpm, start: loopStart });
}

function clearLoop() {
  loopOn = false;
  loopStart = 0;
  loopEnd = 0;
  updateLoopUI();
}

function updateLoopUI() {
  const status = document.getElementById('loop-status');
  if (status) status.textContent = loopOn ? tr('loopOn', 'On') : tr('loopOff', 'Off');
  const len = document.getElementById('loop-length');
  if (len) {
    if (loopOn) {
      const s = loopEnd - loopStart;
      len.textContent = s.toFixed(2) + 's';
    } else {
      len.textContent = '';
    }
  }
  document.querySelectorAll('.loop-bar-btn').forEach(b => b.classList.remove('active'));
}

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
    chatInput.placeholder = tr('chatBlocked', 'Usuario bloqueado.');
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
      chatInput.placeholder = tr('chatBlocked', 'Usuario bloqueado.');
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

function mergeServerUsers(serverUsers) {
  const local = getUsers();
  const byName = Object.fromEntries(local.map(u => [u.username, u]));
  (serverUsers || []).forEach(u => {
    if (!u.username) return;
    if (!byName[u.username]) {
      byName[u.username] = { username: u.username, password: u.password || '', role: u.role || 'invitado', email: u.email || '', date: u.date || '', permissions: u.permissions || {} };
      local.push(byName[u.username]);
    } else {
      const existing = byName[u.username];
      if (u.role) existing.role = u.role;
      if (u.email) existing.email = u.email;
      if (u.date && (!existing.date || new Date(u.date) > new Date(existing.date))) existing.date = u.date;
      if (u.permissions) existing.permissions = { ...existing.permissions, ...u.permissions };
      if (u.password && u.password.length >= 4) existing.password = u.password;
    }
  });
  setUsers(local);
  return local;
}

function fetchJSONP(view, params = '') {
  return new Promise((resolve) => {
    const url = GAS_LOG_URL();
    if (!url || !API_TOKEN) { resolve(null); return; }
    const cb = 'amareaJSONP_' + Math.random().toString(36).slice(2, 9);
    const t = setTimeout(() => { delete window[cb]; resolve(null); }, 8000);
    window[cb] = (res) => { clearTimeout(t); delete window[cb]; resolve(res); };
    const s = document.createElement('script');
    s.src = `${url}?callback=${cb}&view=${view}&token=${encodeURIComponent(API_TOKEN)}${params ? '&' + params : ''}`;
    s.onerror = () => { clearTimeout(t); delete window[cb]; resolve(null); };
    document.head.appendChild(s);
  });
}

function pushUsersSnapshot() {
  const users = getUsers();
  logToSheet('users', { users });
}

function syncUsersFromServer() {
  return new Promise((resolve) => {
    fetchJSONP('users').then(server => {
      if (Array.isArray(server)) mergeServerUsers(server);
      resolve(getUsers());
    });
  });
}

function refreshCurrentUser() {
  if (!currentUser || !currentUser.username) return;
  const users = getUsers();
  const found = users.find(u => u.username === currentUser.username);
  if (!found) {
    logout();
    return;
  }
  const changed = found.role !== currentUser.role || JSON.stringify(found.permissions || {}) !== JSON.stringify(currentUser.permissions || {});
  if (changed) {
    currentUser = { username: found.username, role: found.role, permissions: found.permissions || {} };
    saveCurrent();
    updateAuthUI();
    if (hasPermission(currentUser.role, 'adminPanel', currentUser.permissions)) renderAdmin();
  }
}

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
    const canAdmin = hasPermission(currentUser.role, 'adminPanel', currentUser.permissions);
    document.querySelectorAll('.admin-link').forEach(el => el.classList.toggle('hidden', !canAdmin));
  } else {
    authToggle.textContent = 'ENTRAR';
    authToggleMobile.textContent = 'ENTRAR';
    authTitle.textContent = 'Entrar';
    authSubtitle.textContent = 'Invitados pueden navegar. Clientes inician sesión.';
    document.querySelectorAll('.admin-link').forEach(el => el.classList.add('hidden'));
  }
  renderBriefFormGate();
  if (currentUser && hasPermission(currentUser.role, 'adminPanel', currentUser.permissions)) renderAdmin();
}

const ROLES = ['invitado', 'cliente', 'colaborador', 'residente', 'admin'];
const ROLE_LEVEL = Object.fromEntries(ROLES.map((r, i) => [r, i]));

const ROLE_PERMISSIONS = {
  admin: { brief: true, chat: true, adminPanel: true, editContent: true, editUsers: true },
  residente: { brief: true, chat: true, adminPanel: false, editContent: false, editUsers: false },
  colaborador: { brief: true, chat: true, adminPanel: false, editContent: false, editUsers: false },
  cliente: { brief: false, chat: true, adminPanel: false, editContent: false, editUsers: false },
  invitado: { brief: false, chat: true, adminPanel: false, editContent: false, editUsers: false }
};

const PERMISSION_LABELS = {
  brief: 'Brief',
  chat: 'Chat',
  adminPanel: 'Admin',
  editContent: 'Editar contenido',
  editUsers: 'Editar usuarios'
};

function getPermissions(role, userPerms = {}) {
  return { ...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.invitado), ...userPerms };
}

function hasPermission(role, perm, userPerms = {}) {
  return getPermissions(role, userPerms)[perm] === true;
}

function hasAccess(userRole, minRole) {
  return (ROLE_LEVEL[userRole || 'invitado'] || 0) >= (ROLE_LEVEL[minRole || 0]);
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
  let users = getUsers();
  const server = await fetchJSONP('users');
  if (server && Array.isArray(server)) {
    users = mergeServerUsers(server);
  }
  const found = users.find(u => u.username === username && u.password === password);
  if (!found) return false;
  currentUser = { username: found.username, role: found.role || 'invitado', permissions: found.permissions || {} };
  saveCurrent();
  updateAuthUI();
  logToSheet('login', { id: found.username, role: currentUser.role });
  closeAuth();
  return true;
}

async function register(username, password) {
  let users = getUsers();
  if (users.find(u => u.username === username)) return false;
  if (ADMIN_USERNAME && username === ADMIN_USERNAME) return false;
  const server = await fetchJSONP('users');
  if (server && Array.isArray(server) && server.find(u => u.username === username)) return false;
  users.push({ username, password, role: 'invitado', date: new Date().toISOString() });
  setUsers(users);
  currentUser = { username, role: 'invitado' };
  saveCurrent();
  updateAuthUI();
  logToSheet('register', { id: username, role: 'invitado' });
  pushUsersSnapshot();
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

  authRegister.addEventListener('click', async () => {
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    if (u.length < 3 || p.length < 4) {
      authError.textContent = 'Mínimo 3 caracteres de usuario y 4 de contraseña.';
      authError.classList.remove('hidden');
      return;
    }
    if (await register(u, p)) { authForm.reset(); return; }
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
    ta.placeholder = tr('briefWriteHere', 'Escribe aquí...');
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

function canAccessBrief() {
  return currentUser && hasPermission(currentUser.role, 'brief', currentUser.permissions);
}

function renderBriefFormGate() {
  if (!briefWizard) return;
  if (!canAccessBrief()) {
    briefWizard.classList.add('hidden');
    briefMsg.textContent = tr('briefLoginRequired', 'Inicia sesión como residente, colaborador o admin para responder el cuestionario.');
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
  briefMsg.textContent = tr('briefSaved', 'Borrador guardado.');
  briefMsg.classList.remove('hidden', 'text-white/50');
  briefMsg.classList.add('text-amarea-cyan');
});

briefForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!canAccessBrief()) {
    briefMsg.textContent = tr('briefDenied', 'No tienes permiso para enviar el cuestionario.');
    briefMsg.classList.remove('hidden', 'text-amarea-cyan');
    briefMsg.classList.add('text-amarea-fire');
    return;
  }
  updateAnswers();
  const fullAnswers = {};
  const serverAnswers = {};
  Object.entries(answers).forEach(([k, v]) => {
    if (k === '__step') return;
    fullAnswers[k] = v;
    if ((v || '').toString().trim()) serverAnswers[k] = v;
  });
  const date = new Date().toISOString();
  const localSubmission = { user: currentUser.username, date, answers: fullAnswers };
  const list = getBriefs();
  list.push(localSubmission);
  setBriefs(list);
  logToSheet('cuestionario', { user: currentUser.username, date, answers: serverAnswers });
  localStorage.removeItem(draftKey());
  answers = {};
  currentStep = 0;
  briefStep.innerHTML = '';
  briefWizard.classList.add('hidden');
  briefMsg.textContent = tr('briefSent', 'Cuestionario enviado. Gracias.');
  briefMsg.classList.remove('hidden', 'text-white/50');
  briefMsg.classList.add('text-amarea-cyan');
  if (hasPermission(currentUser.role, 'adminPanel', currentUser.permissions)) renderAdmin();
});

// === ADMIN PANEL ===
function mergeAdminUsers(serverUsers) {
  const local = getUsers();
  const byName = Object.fromEntries(local.map(u => [u.username, u]));
  (serverUsers || []).forEach(u => {
    if (!u.username) return;
    if (!byName[u.username]) {
      byName[u.username] = { username: u.username, password: '', role: u.role || 'invitado', email: u.email || '', date: u.date || '' };
      local.push(byName[u.username]);
    } else {
      const e = byName[u.username];
      if (u.role && u.role !== e.role) e.role = u.role;
      if (u.email) e.email = u.email;
      if (u.date) e.date = u.date;
      if (u.password && u.password.length >= 4) e.password = u.password;
      if (u.permissions) e.permissions = { ...e.permissions, ...u.permissions };
    }
  });
  setUsers(local);
  return local;
}

function mergeAdminBriefs(serverBriefs) {
  const local = getBriefs().slice().reverse();
  const seen = new Set(local.map(b => (b.user || '') + '|' + (b.date || '')));
  (serverBriefs || []).forEach(b => {
    const key = (b.user || '') + '|' + (b.date || '');
    if (!seen.has(key)) local.push(b);
  });
  local.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return local;
}

function loadAdminFromSheets() {
  const url = GAS_LOG_URL();
  if (!url) { renderAdmin(getBriefs().slice().reverse(), getUsers()); return; }
  const cb = 'amareaAdmin_' + Math.random().toString(36).slice(2, 9);
  window[cb] = (res) => {
    delete window[cb];
    const localBriefs = getBriefs().slice().reverse();
    const localUsers = getUsers();
    if (!res || res.error) { renderAdmin(localBriefs, localUsers); return; }
    const serverBriefs = mergeAdminBriefs(res.briefs || []);
    const serverUsers = mergeAdminUsers(res.users || []);
    renderAdmin(serverBriefs, serverUsers);
  };
  const script = document.createElement('script');
  script.src = `${url}?callback=${cb}&view=admin&token=${encodeURIComponent(API_TOKEN)}`;
  script.onerror = () => { delete window[cb]; renderAdmin(getBriefs().slice().reverse(), getUsers()); };
  document.body.appendChild(script);
}

function filterAdmin(query = '') {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.admin-brief-card').forEach(c => {
    c.style.display = q && !(c.dataset.user || '').includes(q) ? 'none' : 'block';
  });
}

function createAdminUser() {
  const name = document.getElementById('admin-new-name')?.value.trim();
  const pass = document.getElementById('admin-new-pass')?.value;
  const role = document.getElementById('admin-new-role')?.value;
  if (!name || !pass || pass.length < 4) { alert(tr('userCreateError', 'Usuario y contraseña mínima de 4 caracteres.')); return; }
  const users = getUsers();
  if (users.find(u => u.username === name)) { alert(tr('userExists', 'El usuario ya existe.')); return; }
  users.push({ username: name, password: pass, role: role || 'invitado', date: new Date().toISOString() });
  setUsers(users);
  logToSheet('register', { id: name, role: role || 'invitado' });
  pushUsersSnapshot();
  renderAdmin();
}

function saveAdminUser(oldName, newName, newPass, newRole, newPerms) {
  if (!newName) { alert(tr('userNameRequired', 'El usuario necesita un nombre.')); return; }
  const users = getUsers();
  const idx = users.findIndex(u => u.username === oldName);
  if (idx < 0) { alert(tr('userNotFound', 'Usuario no encontrado.')); return; }
  if (oldName !== newName && users.find(u => u.username === newName)) { alert(tr('userExists', 'El nuevo nombre ya está en uso.')); return; }
  users[idx].username = newName;
  users[idx].role = newRole;
  users[idx].permissions = newPerms;
  if (newPass && newPass.length >= 4) users[idx].password = newPass;
  setUsers(users);
  logToSheet('set_role', { id: oldName, newId: newName, role: newRole, permissions: newPerms });
  pushUsersSnapshot();
  if (currentUser && currentUser.username === oldName) {
    currentUser = { ...currentUser, username: newName, role: newRole, permissions: newPerms };
    saveCurrent();
    updateAuthUI();
  }
  renderAdmin();
}

function deleteAdminUser(username) {
  let users = getUsers();
  users = users.filter(u => u.username !== username);
  setUsers(users);
  logToSheet('delete_user', { id: username });
  pushUsersSnapshot();
  if (currentUser && currentUser.username === username) {
    logout();
    return;
  }
  renderAdmin();
}

function renderAdmin(briefs = null, users = null) {
  if (!briefs || !users) { loadAdminFromSheets(); return; }
  const briefsContainer = document.getElementById('admin-briefs');
  const usersContainer = document.getElementById('admin-users');
  const stats = document.getElementById('admin-stats');
  if (!briefsContainer || !usersContainer) return;

  const totalUsers = users.length;
  const totalBriefs = briefs.length;
  const totalAnswers = briefs.reduce((sum, b) => sum + Object.values(b.answers || {}).filter(a => (a || '').toString().trim()).length, 0);

  if (stats) {
    stats.innerHTML = `
      <div class="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
        <p class="text-2xl font-display font-bold text-white">${totalUsers}</p>
        <p class="text-[10px] text-white/40 uppercase tracking-widest" data-i18n="adminStatUsers">Usuarios</p>
      </div>
      <div class="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
        <p class="text-2xl font-display font-bold text-white">${totalBriefs}</p>
        <p class="text-[10px] text-white/40 uppercase tracking-widest" data-i18n="adminStatBriefs">Cuestionarios</p>
      </div>
      <div class="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
        <p class="text-2xl font-display font-bold text-white">${totalAnswers}</p>
        <p class="text-[10px] text-white/40 uppercase tracking-widest" data-i18n="adminStatAnswers">Respuestas</p>
      </div>
    `;
  }

  function refreshUsers() {
    const userList = getUsers();
    usersContainer.innerHTML = '';

    const createForm = document.createElement('div');
    createForm.className = 'p-4 rounded-2xl border border-white/5 bg-white/[0.02] mb-4';
    createForm.innerHTML = `
      <p class="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Crear usuario</p>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input id="admin-new-name" type="text" placeholder="Usuario" class="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amarea-cyan outline-none">
        <input id="admin-new-pass" type="password" placeholder="Contraseña" class="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amarea-cyan outline-none">
        <select id="admin-new-role" class="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amarea-cyan outline-none">${ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
        <button id="admin-new-btn" class="px-4 py-2 rounded-xl border border-amarea-pink/30 text-amarea-pink hover:bg-amarea-pink/10 text-[10px] font-display font-bold uppercase tracking-widest transition">Crear</button>
      </div>
    `;
    createForm.querySelector('#admin-new-btn').addEventListener('click', () => createAdminUser());
    usersContainer.appendChild(createForm);

    if (!userList.length) {
      const empty = document.createElement('p');
      empty.className = 'text-white/30 text-sm';
      empty.textContent = tr('noUsers', 'Sin usuarios registrados.');
      usersContainer.appendChild(empty);
      return;
    }

    userList.forEach((u, i) => {
      const perms = getPermissions(u.role, u.permissions);
      const permChecks = Object.keys(PERMISSION_LABELS).map(key => `
        <label class="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer whitespace-nowrap">
          <input type="checkbox" data-perm="${key}" ${perms[key] ? 'checked' : ''} class="accent-amarea-cyan w-3 h-3">
          <span>${PERMISSION_LABELS[key]}</span>
        </label>
      `).join('');
      const div = document.createElement('div');
      div.className = 'p-4 rounded-2xl border border-white/5 bg-white/[0.02] mb-3 admin-user-card';
      div.dataset.user = u.username.toLowerCase();
      div.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-6 gap-2 items-center mb-2">
          <input type="text" class="admin-user-name bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amarea-cyan outline-none" value="${u.username}" placeholder="Usuario">
          <input type="password" class="admin-user-pass bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amarea-cyan outline-none" placeholder="Nueva contraseña">
          <select class="admin-user-role bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amarea-cyan outline-none">${ROLES.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
          <div class="flex flex-wrap gap-3 col-span-1 md:col-span-2">${permChecks}</div>
          <div class="flex gap-2">
            <button class="admin-user-save px-3 py-2 rounded-xl border border-amarea-cyan/30 text-amarea-cyan text-[10px] font-display font-bold uppercase tracking-widest hover:bg-amarea-cyan/10 transition">Guardar</button>
            <button class="admin-user-del px-3 py-2 rounded-xl border border-amarea-fire/30 text-amarea-fire text-[10px] font-display font-bold uppercase tracking-widest hover:bg-amarea-fire/10 transition">×</button>
          </div>
        </div>
        <p class="text-[9px] text-white/30 font-mono">${u.email ? u.email + ' · ' : ''}${u.date ? new Date(u.date).toLocaleString('es-MX') : ''}</p>
      `;
      div.querySelector('.admin-user-save').addEventListener('click', () => {
        const newName = div.querySelector('.admin-user-name').value.trim();
        const newPass = div.querySelector('.admin-user-pass').value;
        const newRole = div.querySelector('.admin-user-role').value;
        const newPerms = {};
        div.querySelectorAll('[data-perm]').forEach(cb => { newPerms[cb.dataset.perm] = cb.checked; });
        saveAdminUser(u.username, newName, newPass, newRole, newPerms);
      });
      div.querySelector('.admin-user-del').addEventListener('click', () => {
        if (confirm(tr('deleteUserConfirm', '¿Eliminar este usuario? Esta acción no se puede deshacer.'))) deleteAdminUser(u.username);
      });
      usersContainer.appendChild(div);
    });
  }

  refreshUsers();

  briefsContainer.innerHTML = briefs.length ? '' : '<p class="text-white/30 text-sm" data-i18n="noBriefs">Sin cuestionarios aún.</p>';
  briefs.forEach((b, i) => {
    const answered = Object.values(b.answers || {}).filter(a => (a || '').toString().trim()).length;
    const percent = Math.round((answered / 161) * 100);
    const div = document.createElement('div');
    div.className = 'p-5 rounded-2xl border border-white/5 bg-white/[0.02] admin-brief-card';
    div.dataset.user = (b.user || '').toLowerCase();
    const header = document.createElement('div');
    header.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div>
          <p class="text-[10px] text-white/30 font-mono uppercase tracking-widest mb-1">${new Date(b.date).toLocaleString('es-MX')} · ${b.user}</p>
          <p class="font-display font-bold text-white mb-1">Cuestionario · ${answered} de 161 respondidas</p>
        </div>
        <span class="text-2xl font-display font-bold text-amarea-cyan">${percent}<span class="text-sm">%</span></span>
      </div>
      <div class="w-full h-1 bg-white/5 rounded overflow-hidden mb-3">
        <div class="h-full bg-amarea-cyan" style="width: ${percent}%"></div>
      </div>
    `;
    const viewText = tr('toggleAnswers', 'Ver respuestas');
    const hideText = tr('hideAnswers', 'Ocultar respuestas');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'text-xs text-amarea-cyan hover:text-white transition font-display uppercase tracking-widest';
    toggle.textContent = viewText;
    const details = document.createElement('div');
    details.className = 'hidden mt-6 space-y-6';
    CUESTIONARIO.forEach(sec => {
      const group = document.createElement('div');
      group.className = 'border-l-2 border-amarea-cyan/20 pl-4';
      group.innerHTML = `<h4 class="font-display font-bold text-amarea-cyan mb-3">${sec.title}</h4>`;
      let hasAny = false;
      sec.questions.forEach(q => {
        const a = (b.answers || {})[q.id] || '';
        if (!a.trim()) return;
        hasAny = true;
        const p = document.createElement('div');
        p.className = 'mb-4';
        p.innerHTML = `<p class="text-sm text-white/80 font-medium mb-1">${q.id.replace('q', '')}. ${q.text}</p><p class="text-sm text-white/60 italic">“${a}”</p>`;
        group.appendChild(p);
      });
      if (hasAny) details.appendChild(group);
    });
    toggle.addEventListener('click', () => { details.classList.toggle('hidden'); toggle.textContent = details.classList.contains('hidden') ? viewText : hideText; });
    div.appendChild(header);
    div.appendChild(toggle);
    div.appendChild(details);
    briefsContainer.appendChild(div);
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

document.getElementById('admin-search')?.addEventListener('input', (e) => filterAdmin(e.target.value));
document.getElementById('refresh-admin')?.addEventListener('click', () => renderAdmin());
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

function initLang() {
  const sel = document.getElementById('lang-select');
  const mobile = document.getElementById('lang-select-mobile');
  const saved = localStorage.getItem('amarea_lang') || 'es';
  if (sel) sel.value = saved;
  if (mobile) mobile.value = saved;
  [sel, mobile].forEach(el => {
    if (!el) return;
    el.addEventListener('change', (e) => { setLang(e.target.value); });
  });
}

// === INIT ===
(async function init() {
  applySiteContent();
  renderResidents();
  renderEvents();
  await loadContent();
  seedAdmin();
  initAnalytics();
  initAuth();
  initLang();
  if (tracks.length) renderTracks(); else await loadTracks();
  renderRadar();
  loadBlocked();
  loadChatFromSheets();
  setInterval(loadChatFromSheets, 5000);
  initMedia();
  updateMixerUI();
  if (currentUser && hasPermission(currentUser.role, 'adminPanel', currentUser.permissions)) renderAdmin();
  await syncUsersFromServer();
  refreshCurrentUser();
  setInterval(refreshCurrentUser, 10000);
  window.addEventListener('focus', refreshCurrentUser);
  switchTab('inicio');
  trackPageview();
  window.miniPlay = togglePlay;
  window.miniNext = () => selectTrack(pickNextTrack());
  window.miniPrev = () => selectTrack(pickPrevTrack());
  updateMiniPlayer();
})();
