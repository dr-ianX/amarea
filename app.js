// AMAREA LANDING — interactive engine

const STORAGE_CHAT = 'amarea_chat_v1';
const STORAGE_NICK = 'amarea_nick_v1';
const STORAGE_JOIN = 'amarea_join_v1';
const STORAGE_USERS = 'amarea_users_v1';
const STORAGE_BRIEFS = 'amarea_briefs_v1';
const STORAGE_CURRENT = 'amarea_current_v1';
const STORAGE_DRAFT = 'amarea_draft_v1';

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
  sections.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  updateActiveNav(id);
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
  const users = getUsers();
  if (!users.find(u => u.username === 'admin')) {
    users.push({ username: 'admin', password: 'amarea2026', role: 'admin' });
    setUsers(users);
  }
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

function login(username, password) {
  const users = getUsers();
  const found = users.find(u => u.username === username && u.password === password);
  if (found) {
    currentUser = { username: found.username, role: found.role };
    saveCurrent();
    updateAuthUI();
    closeAuth();
    return true;
  }
  return false;
}

function register(username, password) {
  const users = getUsers();
  if (users.find(u => u.username === username)) return false;
  users.push({ username, password, role: 'cliente' });
  setUsers(users);
  currentUser = { username, role: 'cliente' };
  saveCurrent();
  updateAuthUI();
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

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    if (login(u, p)) { authForm.reset(); return; }
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

// === INIT ===
seedAdmin();
initAuth();
loadTracks();
renderRadar();
if (currentUser && currentUser.role === 'admin') renderAdmin();
switchTab('inicio');
