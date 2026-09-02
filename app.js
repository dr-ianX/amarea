// AMAREA LANDING — interactive engine

const STORAGE_CHAT = 'amarea_chat_v1';
const STORAGE_NICK = 'amarea_nick_v1';
const STORAGE_JOIN = 'amarea_join_v1';

const residents = [
  { name: 'Akir B', role: 'DJ · Techno / Dark Disco', vibe: 'Sets profundos, texturas desérticas.' },
  { name: 'Lua Mora', role: 'DJ · Indie Dance / House', vibe: 'Conexión, calma y explosión controlada.' },
  { name: 'Simbionte', role: 'Live Act · Música electrónica', vibe: 'Hardware, improvisación y energía cruda.' },
  { name: 'Mentesaka', role: 'Visual & Sound', vibe: 'Entornos inmersivos y diseño lumínico.' }
];

const events = [
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

function switchTab(id) {
  sections.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (mobileMenu) mobileMenu.classList.add('hidden');
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

// === MUSIC LOADER ===
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
  currentTrackIndex = index;
  const t = tracks[index];
  audio.pause();
  audio.src = t.src;
  document.getElementById('current-track').textContent = t.title;
  document.getElementById('current-artist').textContent = t.artist;
  renderTracks();
  playAudio();
}

function playAudio() {
  if (currentTrackIndex < 0) return;
  if (!audioCtx) initAudio();
  audio.play().then(() => {
    isPlaying = true;
    updatePlayButton();
    document.getElementById('vinyl-hero')?.classList.add('playing');
  }).catch(() => {
    // Autoplay blocked or load error
  });
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  updatePlayButton();
  document.getElementById('vinyl-hero')?.classList.remove('playing');
}

function togglePlay() {
  if (currentTrackIndex < 0) {
    selectTrack(0);
    return;
  }
  if (isPlaying) pauseAudio();
  else playAudio();
}

function updatePlayButton() {
  const btn = document.getElementById('play-btn');
  btn.textContent = isPlaying ? '⏸' : '▶';
}

document.getElementById('play-btn').addEventListener('click', togglePlay);
document.getElementById('next-btn').addEventListener('click', () => {
  const next = (currentTrackIndex + 1) % tracks.length;
  selectTrack(next);
});
document.getElementById('prev-btn').addEventListener('click', () => {
  const prev = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  selectTrack(prev);
});

audio.addEventListener('ended', () => {
  const next = (currentTrackIndex + 1) % tracks.length;
  selectTrack(next);
});

audio.addEventListener('timeupdate', () => {
  const progress = document.getElementById('progress');
  if (audio.duration) {
    progress.value = (audio.currentTime / audio.duration) * 100;
    document.getElementById('time-current').textContent = formatTime(audio.currentTime);
    document.getElementById('time-total').textContent = formatTime(audio.duration);
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
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// === VISUALIZER ===
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  drawVisualizer();
}

function drawVisualizer() {
  if (!analyser) return;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const barW = canvas.width / bufferLength;
  for (let i = 0; i < bufferLength; i++) {
    const barH = (dataArray[i] / 255) * canvas.height * 0.9;
    const hue = 300 + (i / bufferLength) * 120;
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${dataArray[i] / 255})`;
    ctx.fillRect(i * barW, canvas.height - barH, barW - 1, barH);
  }

  animationId = requestAnimationFrame(drawVisualizer);
}

// === CHAT ===
const chatNick = document.getElementById('chat-nick');
const setNickBtn = document.getElementById('set-nick');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');

let nickname = localStorage.getItem(STORAGE_NICK) || '';
let chatData = JSON.parse(localStorage.getItem(STORAGE_CHAT) || '[]');

if (nickname) {
  chatNick.value = nickname;
  chatInput.disabled = false;
  chatSend.disabled = false;
}

function renderChat() {
  chatMessages.innerHTML = '';
  chatData.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.author === nickname ? 'own' : 'other'}`;
    div.innerHTML = `
      <p class="text-[10px] uppercase tracking-widest text-white/40 mb-1">${msg.author}</p>
      <p class="text-sm text-white/90">${msg.text}</p>
      <p class="text-[10px] text-white/30 mt-1 text-right">${new Date(msg.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
    `;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(text) {
  if (!nickname || !text.trim()) return;
  const msg = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    author: nickname,
    text: text.trim(),
    date: new Date().toISOString()
  };
  chatData.push(msg);
  if (chatData.length > 100) chatData = chatData.slice(-100);
  localStorage.setItem(STORAGE_CHAT, JSON.stringify(chatData));
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

renderChat();

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
    joinMsg.classList.remove('hidden');
    joinForm.reset();
    setTimeout(() => joinMsg.classList.add('hidden'), 5000);
  }
});

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

// === INIT ===
loadTracks();
switchTab('inicio');
