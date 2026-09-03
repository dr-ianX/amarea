// AMAREA FEATURES — toolkit de comunidad y producción
(function () {
  const STORAGE_RSVP = 'amarea_rsvp_v1';
  const STORAGE_SUBMISSIONS = 'amarea_submissions_v1';
  const STORAGE_PROFILES = 'amarea_profiles_v1';
  const STORAGE_SOCIAL = 'amarea_social_v1';
  const STORAGE_CONTACT = 'amarea_contact_v1';
  const STORAGE_NEWS = 'amarea_news_v1';

  function escapeHTML(t) { return String(t).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function getJSON(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } }
  function setJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function notify(id, text) {
    const el = document.getElementById(id);
    if (el) { el.textContent = text; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 4000); }
  }

  // Newsletter (usa el formulario existente del footer)
  function initNewsletter() {
    const form = document.getElementById('join-form');
    const input = document.getElementById('join-email');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input?.value.trim();
      if (!v || !v.includes('@')) { notify('join-msg', 'Correo no válido.'); return; }
      const data = { email: v, date: new Date().toISOString(), deviceId: getDeviceId() };
      setJSON(STORAGE_NEWS, [...getJSON(STORAGE_NEWS), data]);
      logToSheet('newsletter', data);
      notify('join-msg', 'Bienvenido a la comunidad AMAREA.');
      input.value = '';
      renderMetrics();
    });
  }

  // Contacto con producción (abre app nativa)
  function initContact() {
    const form = document.getElementById('prod-contact-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        type: String(fd.get('type') || 'general'),
        message: String(fd.get('message') || '').trim(),
        date: new Date().toISOString(),
        deviceId: getDeviceId()
      };
      if (!data.email || !data.message) { notify('prod-contact-msg', 'Completa correo y mensaje.'); return; }
      const to = (window.AMAREA_CONFIG?.CONTACT_EMAIL || '').trim();
      if (!to) { notify('prod-contact-msg', 'No hay email de contacto configurado.'); return; }
      const subject = encodeURIComponent(`[AMAREA] Contacto - ${data.type}`);
      const body = encodeURIComponent(`De: ${data.name}\nEmail: ${data.email}\nTipo: ${data.type}\n\n${data.message}`);
      logToSheet('contact', data);
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      notify('prod-contact-msg', 'Se abrió tu app de correo.');
      form.reset();
      renderMetrics();
    });
  }

  // Convocatoria de residentes
  function initResidentSub() {
    const form = document.getElementById('prod-resident-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        artist: String(fd.get('artist') || '').trim(),
        role: String(fd.get('role') || 'dj'),
        email: String(fd.get('email') || '').trim(),
        bio: String(fd.get('bio') || '').trim(),
        link: String(fd.get('link') || '').trim(),
        date: new Date().toISOString(),
        deviceId: getDeviceId()
      };
      if (!data.artist || !data.email) { notify('prod-resident-msg', 'Nombre y correo son obligatorios.'); return; }
      setJSON(STORAGE_SUBMISSIONS, [...getJSON(STORAGE_SUBMISSIONS), data]);
      logToSheet('resident_sub', data);
      notify('prod-resident-msg', 'Postulación registrada. La revisaremos en privado.');
      form.reset();
      renderMetrics();
    });
  }

  // Perfil anónimo de asistente
  function initProfiles() {
    const form = document.getElementById('prod-profile-form');
    const list = document.getElementById('prod-profile-list');
    if (!form) return;
    const stored = JSON.parse(localStorage.getItem(STORAGE_PROFILES) || 'null');
    if (stored) form.name.value = stored.name || '';
    if (stored) form.role.value = stored.role || '';
    if (stored) form.from.value = stored.from || '';
    if (stored) form.tags.value = stored.tags || '';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: String(form.name?.value || '').trim() || 'Anónimo',
        role: String(form.role?.value || '').trim(),
        from: String(form.from?.value || '').trim(),
        tags: String(form.tags?.value || '').trim(),
        date: new Date().toISOString(),
        deviceId: getDeviceId()
      };
      localStorage.setItem(STORAGE_PROFILES, JSON.stringify(data));
      logToSheet('profile', data);
      notify('prod-profile-msg', 'Perfil anónimo guardado.');
      renderProfiles();
      renderMetrics();
    });

    renderProfiles();
  }

  function renderProfiles() {
    const list = document.getElementById('prod-profile-list');
    if (!list) return;
    const p = JSON.parse(localStorage.getItem(STORAGE_PROFILES) || 'null');
    if (!p) { list.innerHTML = '<p class="text-white/40 text-sm">Aún no hay perfiles públicos guardados localmente.</p>'; return; }
    const tags = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    list.innerHTML = `
      <div class="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
        <p class="text-xl font-display font-bold text-amarea-cyan">${escapeHTML(p.name)}</p>
        <p class="text-xs text-white/40 font-mono uppercase tracking-widest mb-2">${escapeHTML(p.role || 'Asistente')} · ${escapeHTML(p.from || '—')}</p>
        <div class="flex flex-wrap gap-2">
          ${tags.map(t => `<span class="text-[10px] font-display uppercase tracking-widest px-2 py-1 rounded border border-amarea-pink/30 text-amarea-pink">${escapeHTML(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // RSVP para eventos
  function renderRSVP() {
    const list = document.getElementById('produccion-rsvp-list');
    if (!list || typeof events === 'undefined') return;
    list.innerHTML = '';
    const rsvps = getJSON(STORAGE_RSVP);
    const myEvents = new Set(rsvps.filter(r => r.deviceId === getDeviceId()).map(r => r.event));
    const counts = {};
    rsvps.forEach(r => { counts[r.event] = (counts[r.event] || 0) + 1; });

    events.forEach(ev => {
      const d = new Date(ev.date);
      const isPast = d < new Date();
      const count = counts[ev.title] || 0;
      const confirmed = myEvents.has(ev.title);
      const div = document.createElement('div');
      div.className = 'event-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-4';
      div.innerHTML = `
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-white/5 text-white/60">${escapeHTML(ev.tag)}</span>
            <span class="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded ${isPast ? 'bg-white/10 text-white/40' : 'bg-amarea-pink/10 text-amarea-pink'}">${isPast ? 'Pasado' : escapeHTML(ev.status)}</span>
          </div>
          <h3 class="text-2xl md:text-3xl font-display font-bold text-white mb-1">${escapeHTML(ev.title)}</h3>
          <p class="text-white/50 font-mono text-sm">${d.toLocaleDateString('es-MX', { weekday: 'long', month: 'short', day: 'numeric' })} · ${escapeHTML(ev.location)}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="text-xs text-white/40 font-mono">${count} interesados</span>
          <button class="rsvp-btn px-5 py-2 rounded-xl border text-xs font-display font-bold uppercase tracking-widest transition ${confirmed ? 'border-amarea-gold text-amarea-gold opacity-60 cursor-default' : 'border-amarea-cyan/30 text-amarea-cyan hover:bg-amarea-cyan hover:text-black'}" data-event="${escapeHTML(ev.title)}">${confirmed ? 'Confirmado' : 'Me interesa'}</button>
        </div>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll('.rsvp-btn').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      const event = b.dataset.event;
      const data = { event, deviceId: getDeviceId(), date: new Date().toISOString() };
      setJSON(STORAGE_RSVP, [...getJSON(STORAGE_RSVP), data]);
      logToSheet('rsvp', data);
      b.textContent = 'Confirmado';
      b.disabled = true;
      b.classList.add('opacity-60', 'cursor-default');
      b.classList.remove('border-amarea-cyan/30', 'text-amarea-cyan', 'hover:bg-amarea-cyan', 'hover:text-black');
      b.classList.add('border-amarea-gold', 'text-amarea-gold');
      renderMetrics();
    }));
  }

  // Sala de prensa
  function initPress() {
    const btn = document.getElementById('prod-press-download');
    if (!btn) return;
    const data = {
      project: 'AMAREA',
      tagline: 'La noche nos une',
      origin: 'San José del Cabo, Baja California Sur',
      since: '2026',
      contact: 'hello@amarea.mx',
      social: { instagram: '@amareaoficial', venue: 'CRANIA' }
    };
    btn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'amarea-press-kit.json';
      a.click();
      URL.revokeObjectURL(url);
      logToSheet('press_download', { date: new Date().toISOString(), deviceId: getDeviceId() });
    });
  }

  // Tienda y boletos (placeholders configurables desde localStorage)
  function initStore() {
    const container = document.getElementById('prod-store-links');
    if (!container) return;
    const social = JSON.parse(localStorage.getItem(STORAGE_SOCIAL) || '{}');
    container.innerHTML = '';
    const links = [
      { name: 'Tickets Ticketfairy', url: social.tickets || 'https://www.ticketfairy.com' },
      { name: 'Merch (próximamente)', url: social.merch || '#' },
      { name: 'Bookings', url: 'mailto:hello@amarea.mx' }
    ];
    links.forEach(l => {
      const a = document.createElement('a');
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'px-5 py-2 rounded-xl border border-white/10 text-xs font-display font-bold uppercase tracking-widest hover:border-amarea-pink hover:text-amarea-pink transition';
      a.textContent = l.name;
      if (l.url === '#') { a.classList.add('opacity-40', 'pointer-events-none'); }
      container.appendChild(a);
    });
  }

  // Integraciones sociales
  function initSocial() {
    const form = document.getElementById('prod-social-form');
    if (form) {
      const stored = JSON.parse(localStorage.getItem(STORAGE_SOCIAL) || '{}');
      if (stored.discord) form.discord.value = stored.discord;
      if (stored.telegram) form.telegram.value = stored.telegram;
      if (stored.tickets) form.tickets.value = stored.tickets;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          discord: String(form.discord?.value || '').trim(),
          telegram: String(form.telegram?.value || '').trim(),
          tickets: String(form.tickets?.value || '').trim()
        };
        localStorage.setItem(STORAGE_SOCIAL, JSON.stringify(data));
        logToSheet('social_config', data);
        notify('prod-social-msg', 'Enlaces sociales actualizados.');
        initStore();
      });
    }
    const links = JSON.parse(localStorage.getItem(STORAGE_SOCIAL) || '{}');
    const d = document.getElementById('prod-discord-link');
    const t = document.getElementById('prod-telegram-link');
    if (d) { d.href = links.discord || '#'; if (!links.discord) d.classList.add('opacity-40', 'pointer-events-none'); }
    if (t) { t.href = links.telegram || '#'; if (!links.telegram) t.classList.add('opacity-40', 'pointer-events-none'); }
  }

  // Métricas locales
  function renderMetrics() {
    const panel = document.getElementById('prod-metrics');
    if (!panel) return;
    const metrics = [
      { label: 'Newsletter', count: getJSON(STORAGE_NEWS).length },
      { label: 'RSVPs', count: getJSON(STORAGE_RSVP).length },
      { label: 'Contactos', count: getJSON(STORAGE_CONTACT).length },
      { label: 'Postulaciones', count: getJSON(STORAGE_SUBMISSIONS).length }
    ];
    panel.innerHTML = metrics.map(m => `
      <div class="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
        <p class="text-2xl font-display font-bold text-amarea-cyan">${m.count}</p>
        <p class="text-[10px] font-mono uppercase tracking-widest text-white/40">${m.label}</p>
      </div>
    `).join('');
  }

  // Canales temáticos (placeholders)
  function initForums() {
    const list = document.getElementById('prod-forums');
    if (!list) return;
    list.innerHTML = `
      <button class="forum-pill px-4 py-2 rounded-full border border-amarea-cyan/30 text-amarea-cyan text-xs font-display font-bold uppercase tracking-widest hover:bg-amarea-cyan/10 transition">#música</button>
      <button class="forum-pill px-4 py-2 rounded-full border border-amarea-pink/30 text-amarea-pink text-xs font-display font-bold uppercase tracking-widest hover:bg-amarea-pink/10 transition">#visuales</button>
      <button class="forum-pill px-4 py-2 rounded-full border border-amarea-gold/30 text-amarea-gold text-xs font-display font-bold uppercase tracking-widest hover:bg-amarea-gold/10 transition">#producción</button>
      <button class="forum-pill px-4 py-2 rounded-full border border-amarea-violet/30 text-amarea-violet text-xs font-display font-bold uppercase tracking-widest hover:bg-amarea-violet/10 transition">#afters</button>
    `;
    list.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      notify('prod-forum-msg', `Próximamente: foro ${b.textContent}`);
    }));
  }

  function init() {
    initNewsletter();
    initContact();
    initResidentSub();
    initProfiles();
    renderRSVP();
    initPress();
    initStore();
    initSocial();
    initForums();
    renderMetrics();
  }

  init();
})();
