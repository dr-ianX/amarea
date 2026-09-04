// AMAREA FEATURES — toolkit de comunidad y producción
(function () {
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
      notify('join-msg', (typeof tr === 'function' ? tr('joinWelcome', 'Bienvenido a la comunidad AMAREA.') : 'Bienvenido a la comunidad AMAREA.'));
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

  // Cotizador / booking wizard
  function initBooking() {
    const container = document.getElementById('booking-wizard');
    const msg = document.getElementById('booking-msg');
    if (!container) return;

    const STORAGE_BOOKING = 'amarea_booking_v1';
    let state = { type: '', answers: {}, contact: {} };

    const TYPES = {
      full: { label: 'Fiesta AMAREA full', color: 'amarea-cyan', base: 85000, guest: 1200, hour: 3000, desc: 'Casa productora completa: venue, sonido, luces, visuales, DJs, bar y logística.' },
      dj: { label: 'DJ AMAREA', color: 'amarea-pink', base: 15000, hour: 3500, desc: 'Selección musical, mezcla y curaduría para tu evento.' },
      lights: { label: 'Luces & Visuales', color: 'amarea-gold', base: 25000, hour: 2000, desc: 'Diseño lumínico, láser, LED, mapeo y VJ.' },
      boat: { label: 'Fiesta en barco', color: 'amarea-violet', base: 120000, guest: 1500, hour: 4000, desc: 'Experiencia AMAREA sobre el agua: embarcación, sonido, bar, ruta y crew.' },
      bar: { label: 'Bar & Drinks', color: 'white', base: 18000, guest: 800, hour: 1200, desc: 'Servicio de bar, bartenders, cristalería y menú de cócteles.' }
    };

    function qs(group, label, extra = {}) {
      return { group, label, ...extra };
    }

    const QUESTIONS = {
      common: [
        qs('when', 'Fecha tentativa', { type: 'date' }),
        qs('where', 'Ubicación', { type: 'select', options: ['CRANIA · San José del Cabo', 'Playa privada · BCS', 'Barco / embarcación', 'Otro (especificar abajo)'] }),
        qs('guests', 'Número de invitados', { type: 'number', min: 1, placeholder: 'p. ej. 120' }),
        qs('hours', 'Duración en horas', { type: 'number', min: 1, placeholder: 'p. ej. 5' }),
        qs('notes', 'Notas / referencias', { type: 'textarea', placeholder: 'Estilo, referencias, necesidades especiales...' })
      ],
      full: [
        qs('style', 'Estilo musical', { type: 'select', options: ['Techno', 'House', 'Dark disco', 'Indie dance', 'Balearic', 'Mix'] }),
        qs('bar', 'Incluir servicio de bar', { type: 'checkbox' }),
        qs('catering', 'Incluir catering', { type: 'checkbox' }),
        qs('transport', 'Transporte de invitados', { type: 'checkbox' }),
        qs('rooms', 'Backstage / camerinos', { type: 'checkbox' })
      ],
      dj: [
        qs('djs', 'Cantidad de DJs', { type: 'number', min: 1, max: 5, value: 1 }),
        qs('genre', 'Género principal', { type: 'select', options: ['Techno', 'House', 'Disco', 'Indie dance', 'Minimal', 'Otro'] }),
        qs('sound', 'Necesito equipo de sonido', { type: 'checkbox' }),
        qs('booth', 'Cabina / estructura para DJ', { type: 'checkbox' })
      ],
      lights: [
        qs('setup', 'Tipo de montaje', { type: 'select', options: ['Láser', 'LED', 'Mapeo / proyección', 'Truss + móviles', 'Full'] }),
        qs('venueSize', 'Tamaño aproximado', { type: 'select', options: ['< 100 personas', '100–300', '300–800', '800+'] }),
        qs('vj', 'Incluir VJ / visuales', { type: 'checkbox' }),
        qs('outdoor', 'Montaje al aire libre', { type: 'checkbox' })
      ],
      boat: [
        qs('people', 'Número de personas', { type: 'number', min: 10, placeholder: 'p. ej. 40' }),
        qs('route', 'Ruta', { type: 'select', options: ['Bahía San José', 'El Arco / Land\'s End', 'Sunset cruise', 'A la medida'] }),
        qs('boatSound', 'Sonido en barco', { type: 'checkbox' }),
        qs('boatBar', 'Bar a bordo', { type: 'checkbox' }),
        qs('boatCatering', 'Catering', { type: 'checkbox' }),
        qs('djs', 'DJs incluidos', { type: 'number', min: 0, max: 3, value: 1 })
      ],
      bar: [
        qs('drinkType', 'Tipo de bar', { type: 'select', options: ['Cócteles', 'Cerveza & vino', 'Open bar', 'Signature AMAREA'] }),
        qs('bartenders', 'Bartenders', { type: 'number', min: 1, value: 2 }),
        qs('glassware', 'Cristalería premium', { type: 'checkbox' }),
        qs('ice', 'Hielo y garrafones', { type: 'checkbox' })
      ]
    };

    function renderStep0() {
      container.innerHTML = `
        <p class="text-white/60 text-sm mb-3">Elige lo que quieres cotizar. Cada ramificación es diferente.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${Object.entries(TYPES).map(([k, t]) => `<button class="booking-type text-left p-4 rounded-xl border border-${t.color}/30 text-white hover:bg-white/[0.03] transition" data-type="${k}">
            <span class="block text-sm font-display font-bold uppercase tracking-widest text-${t.color} mb-1">${t.label}</span>
            <span class="block text-xs text-white/40 leading-snug">${t.desc}</span>
          </button>`).join('')}
        </div>
      `;
      container.querySelectorAll('.booking-type').forEach(b => b.addEventListener('click', () => {
        state.type = b.dataset.type;
        state.answers = {};
        renderStep1();
      }));
    }

    function fieldHTML(q, val = '') {
      if (q.type === 'select') {
        return `<select name="${q.group}" class="booking-field w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-cyan outline-none">
          ${q.options.map(o => `<option value="${escapeHTML(o)}" ${o === val ? 'selected' : ''}>${escapeHTML(o)}</option>`).join('')}
        </select>`;
      }
      if (q.type === 'checkbox') {
        return `<label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" name="${q.group}" class="booking-field accent-amarea-cyan w-4 h-4" ${val ? 'checked' : ''}>
          <span>${escapeHTML(q.label)}</span>
        </label>`;
      }
      if (q.type === 'textarea') {
        return `<textarea name="${q.group}" rows="3" placeholder="${escapeHTML(q.placeholder || '')}" class="booking-field w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-cyan outline-none">${escapeHTML(val)}</textarea>`;
      }
      return `<input type="${q.type}" name="${q.group}" value="${escapeHTML(val)}" min="${q.min || ''}" max="${q.max || ''}" placeholder="${escapeHTML(q.placeholder || '')}" class="booking-field w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-cyan outline-none">`;
    }

    function renderStep1() {
      const t = TYPES[state.type];
      const list = [...QUESTIONS.common, ...(QUESTIONS[state.type] || [])];
      container.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <button class="booking-back text-xs text-white/40 hover:text-white">← Regresar</button>
        </div>
        <p class="text-${t.color} text-xs font-mono uppercase tracking-widest mb-3">${t.label}</p>
        <div class="space-y-3">
          ${list.map(q => `<div><label class="block text-xs text-white/50 mb-1">${escapeHTML(q.label)}</label>${fieldHTML(q, state.answers[q.group])}</div>`).join('')}
        </div>
        <button class="booking-next mt-4 w-full py-3 rounded-xl bg-amarea-cyan text-black font-display font-bold uppercase tracking-widest text-xs hover:bg-white transition">Siguiente</button>
      `;
      container.querySelector('.booking-back').addEventListener('click', renderStep0);
      container.querySelector('.booking-next').addEventListener('click', () => {
        container.querySelectorAll('.booking-field').forEach(el => {
          state.answers[el.name] = el.type === 'checkbox' ? el.checked : el.value;
        });
        renderStep2();
      });
    }

    function renderStep2() {
      container.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <button class="booking-back text-xs text-white/40 hover:text-white">← Regresar</button>
        </div>
        <p class="text-white/60 text-sm mb-3">Tus datos para enviar la cotización.</p>
        <div class="space-y-3">
          <div><label class="block text-xs text-white/50 mb-1">Nombre / empresa</label><input id="booking-name" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-cyan outline-none" value="${escapeHTML(state.contact.name || '')}"></div>
          <div><label class="block text-xs text-white/50 mb-1">Correo</label><input id="booking-email" type="email" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-cyan outline-none" value="${escapeHTML(state.contact.email || '')}"></div>
          <div><label class="block text-xs text-white/50 mb-1">Teléfono</label><input id="booking-phone" type="tel" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amarea-cyan outline-none" value="${escapeHTML(state.contact.phone || '')}"></div>
        </div>
        <button class="booking-quote mt-4 w-full py-3 rounded-xl bg-amarea-pink text-black font-display font-bold uppercase tracking-widest text-xs hover:bg-white transition">Ver cotización</button>
      `;
      container.querySelector('.booking-back').addEventListener('click', renderStep1);
      container.querySelector('.booking-quote').addEventListener('click', () => {
        state.contact = {
          name: document.getElementById('booking-name').value,
          email: document.getElementById('booking-email').value,
          phone: document.getElementById('booking-phone').value
        };
        if (!state.contact.email) { notify('booking-msg', 'El correo es obligatorio.'); return; }
        renderStep3();
      });
    }

    function formatMoney(n) {
      return '$' + Math.round(n).toLocaleString('es-MX') + ' MXN';
    }

    function calculateQuote() {
      const t = TYPES[state.type];
      const a = state.answers;
      const guests = parseInt(a.guests) || 0;
      const hours = parseInt(a.hours) || 0;
      let total = t.base + (guests * t.guest) + (hours * t.hour);

      if (state.type === 'full') {
        if (a.bar) total += guests * 350 + hours * 1500;
        if (a.catering) total += guests * 450;
        if (a.transport) total += 8000;
        if (a.rooms) total += 5000;
      }
      if (state.type === 'dj') {
        const djs = parseInt(a.djs) || 1;
        total = t.base + ((djs - 1) * 8000) + (hours * t.hour);
        if (a.sound) total += 12000 + guests * 80;
        if (a.booth) total += 3500;
      }
      if (state.type === 'lights') {
        total = t.base + (hours * t.hour);
        if (a.venueSize === '100–300') total += 8000;
        if (a.venueSize === '300–800') total += 22000;
        if (a.venueSize === '800+') total += 45000;
        if (a.vj) total += hours * 2500;
        if (a.outdoor) total += 6000;
      }
      if (state.type === 'boat') {
        const people = parseInt(a.people) || 0;
        const djs = parseInt(a.djs) || 0;
        total = t.base + (people * t.guest) + (hours * t.hour) + (djs * 10000);
        if (a.boatSound) total += people * 120;
        if (a.boatBar) total += people * 350;
        if (a.boatCatering) total += people * 550;
      }
      if (state.type === 'bar') {
        const bartenders = parseInt(a.bartenders) || 1;
        total = t.base + (bartenders * 3500) + (hours * t.hour) + (guests * t.guest);
        if (a.glassware) total += guests * 45;
        if (a.ice) total += 2500;
      }
      return total;
    }

    function renderStep3() {
      const total = calculateQuote();
      const t = TYPES[state.type];
      const lines = Object.entries(state.answers).filter(([, v]) => v && v !== 'Otro (especificar abajo)').map(([k, v]) => {
        const all = [...QUESTIONS.common, ...(QUESTIONS[state.type] || [])];
        const q = all.find(x => x.group === k);
        if (!q) return '';
        const label = q.label;
        const value = q.type === 'checkbox' ? (v ? 'Sí' : 'No') : v;
        return `<p class="text-xs text-white/50"><span class="text-white/30">${escapeHTML(label)}:</span> ${escapeHTML(value)}</p>`;
      }).filter(Boolean).join('');
      container.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <button class="booking-back text-xs text-white/40 hover:text-white">← Regresar</button>
        </div>
        <p class="text-${t.color} text-sm font-display font-bold uppercase tracking-widest mb-2">${t.label}</p>
        <div class="space-y-1 mb-4">${lines}</div>
        <div class="rounded-2xl border border-amarea-cyan/20 bg-amarea-cyan/5 p-4 mb-4">
          <p class="text-[10px] text-white/40 uppercase tracking-widest mb-1">Cotización estimada</p>
          <p class="text-3xl font-display font-bold text-amarea-cyan">${formatMoney(total)}</p>
          <p class="text-[10px] text-white/30 mt-1">Montos de referencia. Se ajustan según detalles reales.</p>
        </div>
        <button class="booking-send w-full py-3 rounded-xl bg-amarea-gold text-black font-display font-bold uppercase tracking-widest text-xs hover:bg-white transition">Enviar cotización</button>
      `;
      container.querySelector('.booking-back').addEventListener('click', renderStep2);
      container.querySelector('.booking-send').addEventListener('click', () => {
        const data = { type: 'booking', subtype: state.type, answers: state.answers, contact: state.contact, estimate: total, date: new Date().toISOString(), deviceId: getDeviceId() };
        const history = getJSON(STORAGE_BOOKING);
        setJSON(STORAGE_BOOKING, [...history, data]);
        logToSheet('booking', data);
        const to = (window.AMAREA_CONFIG?.CONTACT_EMAIL || '').trim();
        if (to) {
          const subject = encodeURIComponent(`[AMAREA] Cotización ${TYPES[state.type].label}`);
          const body = encodeURIComponent(`Cotización estimada: ${formatMoney(total)}\n\nServicio: ${TYPES[state.type].label}\nContacto: ${state.contact.name}\nEmail: ${state.contact.email}\nTel: ${state.contact.phone}\n\nResumen:\n${JSON.stringify(state.answers, null, 2)}`);
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        }
        notify('booking-msg', 'Cotización enviada. Te contactaremos pronto.');
        renderStep0();
      });
    }

    renderStep0();
  }

  function init() {
    initNewsletter();
    initBooking();
    initResidentSub();
    initProfiles();
    initPress();
    initStore();
    initSocial();
    initForums();
    renderMetrics();
  }

  init();
})();
