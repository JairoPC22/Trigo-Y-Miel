(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const vh = () => window.innerHeight;

  /* Cada línea de un título recibe su índice para escalonar la entrada. */
  $$('.mask, .info__name').forEach(el => $$('.ln', el).forEach((ln, i) => ln.style.setProperty('--k', i)));

  /* Navbar y menú lateral */
  const header = $('.site-header');
  const burger = $('.burger');
  const nav = $('#menu');
  const scrim = $('.nav-scrim');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('is-on'));
      setTimeout(() => $('a', nav)?.focus(), 350);
    } else {
      scrim.classList.remove('is-on');
      setTimeout(() => { if (!nav.classList.contains('is-open')) scrim.hidden = true; }, 500);
    }
  }
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  scrim.addEventListener('click', () => setMenu(false));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  nav.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
    const f = [burger, ...$$('a', nav)];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  const sectionToNav = { inicio: 'inicio', especialidades: 'especialidades', destacado: 'especialidades', nosotros: 'nosotros', secuencia: 'nosotros', opiniones: 'nosotros', sucursales: 'sucursales' };
  const navLinks = $$('[data-nav]');
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const key = sectionToNav[en.target.id];
      navLinks.forEach(a => a.classList.toggle('is-current', a.dataset.nav === key));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section').forEach(s => navObserver.observe(s));

  /* Hero: sincroniza imagen, número, texto e indicador con una transición editorial. */
  const hero = $('.hero');
  const stage = $('.stage');
  const slides = $$('.slide', stage);
  const thumbs = $$('.thumb');
  const live = $('#hero-live');
  const playBtn = $('.arrow--play');
  const total = slides.length;
  const AUTOPLAY_MS = 6500;
  let current = 0;
  let ring = 0;
  let timer = 0;
  let userPaused = reduce;
  let hovering = false;
  let heroVisible = true;

  hero.style.setProperty('--dur', AUTOPLAY_MS + 'ms');
  if (reduce) { hero.classList.add('no-auto'); playBtn.setAttribute('aria-pressed', 'true'); }

  function restartBar() {
    const t = thumbs[current];
    t.classList.remove('is-active');
    void t.offsetWidth;
    t.classList.add('is-active');
  }

  function schedule() {
    clearTimeout(timer);
    if (userPaused || hovering || !heroVisible) return;
    timer = setTimeout(() => go(current + 1, 1), AUTOPLAY_MS);
  }

  function go(to, dir) {
    to = (to + total) % total;
    if (to === current) return;
    dir = dir || (to > current ? 1 : -1);

    const prev = slides[current];
    const next = slides[to];
    slides.forEach(s => { if (s !== prev && s !== next) s.classList.remove('is-leaving'); });

    stage.style.setProperty('--dir', dir);
    void stage.offsetWidth;

    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    prev.setAttribute('aria-hidden', 'true');
    prev.inert = true;
    clearTimeout(prev._t);
    prev._t = setTimeout(() => prev.classList.remove('is-leaving'), 1250);

    next.classList.remove('is-leaving');
    next.classList.add('is-active');
    next.removeAttribute('aria-hidden');
    next.inert = false;

    thumbs.forEach((t, i) => {
      t.classList.toggle('is-active', i === to);
      t.toggleAttribute('aria-current', i === to);
    });

    ring += 90 * dir;
    stage.style.setProperty('--ring', ring + 'deg');
    current = to;
    live.textContent = `${to + 1} de ${total}: ${$$('.ln', next).map(l => l.textContent).join(' ')}`;
    schedule();
  }

  $$('[data-step]').forEach(b => b.addEventListener('click', () => go(current + Number(b.dataset.step), Number(b.dataset.step))));
  thumbs.forEach(t => t.addEventListener('click', () => go(Number(t.dataset.go))));

  playBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    playBtn.setAttribute('aria-pressed', String(userPaused));
    playBtn.setAttribute('aria-label', userPaused ? 'Reanudar rotación automática' : 'Pausar rotación automática');
    hero.classList.toggle('no-auto', userPaused);
    if (!userPaused) restartBar();
    schedule();
  });

  [stage, $('.hero__ctrl')].forEach(el => {
    el.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      hovering = true; hero.classList.add('is-paused'); clearTimeout(timer);
    });
    el.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      hovering = false; hero.classList.remove('is-paused');
      if (!userPaused) restartBar();
      schedule();
    });
  });
  hero.addEventListener('focusin', () => { hero.classList.add('is-paused'); clearTimeout(timer); });
  hero.addEventListener('focusout', () => { if (!hovering) { hero.classList.remove('is-paused'); schedule(); } });

  let sx = 0, sy = 0, tracking = false;
  stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; tracking = true; });
  stage.addEventListener('pointerup', e => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { tracking = false; });

  document.addEventListener('keydown', e => {
    if (!heroVisible || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || !$('#cal').hidden || $('dialog[open]')) return;
    go(current + (e.key === 'ArrowRight' ? 1 : -1), e.key === 'ArrowRight' ? 1 : -1);
  });

  new IntersectionObserver(([en]) => {
    heroVisible = en.isIntersecting;
    if (heroVisible) { if (!userPaused && !hovering) restartBar(); schedule(); } else clearTimeout(timer);
  }, { threshold: .25 }).observe(hero);

  /* Entrada inicial del hero */
  slides[0].classList.remove('is-active');
  const intro = () => {
    $('.hero h1').classList.add('is-in');
    slides[0].classList.add('is-active');
    schedule();
  };
  const curtain = $('.intro');
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve();
  if (reduce) { curtain.remove(); fontsReady.then(intro); }
  else {
    Promise.all([fontsReady, new Promise(r => setTimeout(r, 1100))]).then(() => {
      curtain.classList.add('is-done');
      setTimeout(intro, 300);
      setTimeout(() => curtain.remove(), 1400);
    });
  }

  /* Reveals por IntersectionObserver, cada tipo con su propio gesto. */
  $$('.foot__main > *, .foot__base').forEach((el, i) => el.style.setProperty('--i', i));
  $$('.facts li').forEach((el, i) => { el.style.transitionDelay = i * .18 + 's'; });
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObserver.unobserve(en.target);
    });
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('.mask, [data-reveal], .facts li, .foot').filter(el => !el.matches('.hero h1')).forEach(el => revealObserver.observe(el));

  /* Texto de Nosotros: se revela palabra por palabra con el scroll. */
  const aboutText = $('[data-words]');
  const words = [];
  aboutText.innerHTML = aboutText.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  $$('.w', aboutText).forEach(w => words.push(w));
  let wordsOn = 0;

  /* Parallax, piezas desplazadas y secuencia horizontal comparten un solo ciclo de scroll. */
  const featureFrame = $('.feature__cut');
  const featurePhoto = $('.feature__photo');
  const shifters = $$('[data-shift]');
  const seq = $('.seq');
  const panels = $$('.seq__panel');
  const ticks = $$('.seq__ticks li');
  const seal = $('.seal');
  const foot = $('.foot');
  const toTop = $('#totop');
  const marq = $('.marq');
  const marqTrack = $('.marq__track');
  const seqTicks = $('.seq__ticks');
  const progress = $('.progress');
  let ticking = false;
  let lastY = scrollY;
  let marqX = 0, marqSpeed = 0;

  /* La cinta de palabras avanza sola y acelera, o invierte, según el scroll. */
  function marqLoop() {
    const r = marq.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh() && !document.documentElement.classList.contains('modal-open')) {
      marqX -= .5 + marqSpeed;
      const half = marqTrack.scrollWidth / 3;
      if (marqX <= -half) marqX += half;
      if (marqX > 0) marqX -= half;
      marqTrack.style.transform = `translate3d(${marqX.toFixed(1)}px,0,0)`;
    }
    marqSpeed *= .92;
    requestAnimationFrame(marqLoop);
  }
  if (!reduce) requestAnimationFrame(marqLoop);

  function frame() {
    ticking = false;
    const h = vh();
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    $('#qfab').classList.toggle('is-show', window.scrollY > h * .6 || $('[data-qcount]').textContent !== '0');
    const max = document.documentElement.scrollHeight - h;
    const sp = max > 0 ? (window.scrollY / max).toFixed(4) : 0;
    progress.style.setProperty('--sp', sp);
    toTop.style.setProperty('--sp', sp);
    toTop.classList.toggle('is-show', window.scrollY > h * 1.1);
    marqSpeed = clamp(marqSpeed + (window.scrollY - lastY) * .06, -14, 14);
    lastY = window.scrollY;

    if (!reduce) {
      seal.style.setProperty('--rot', (window.scrollY * .18).toFixed(1) + 'deg');
      const fr = featurePhoto.getBoundingClientRect();
      if (fr.bottom > -100 && fr.top < h + 100) featureFrame.style.setProperty('--py', ((h / 2 - (fr.top + fr.height / 2)) * .09).toFixed(1));

      shifters.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > h + 100) return;
        const d = Number(el.dataset.shift);
        el.style.setProperty('--sx', clamp(d * (r.top + r.height / 2 - h / 2) * .07, -64, 64).toFixed(1));
      });

      const sr = seq.getBoundingClientRect();
      if (sr.bottom > -50 && sr.top < h + 50) {
        const sticky = $('.seq__sticky');
        const p = clamp((parseFloat(getComputedStyle(sticky).top) - sr.top) / (seq.offsetHeight - sticky.offsetHeight), 0, 1);
        seq.style.setProperty('--p', p.toFixed(4));
        panels.forEach((el, i) => {
          const f = p * (panels.length - 1) - i;
          el.style.setProperty('--f', f.toFixed(3));
          el.style.setProperty('--a', Math.min(1, Math.abs(f)).toFixed(3));
        });
        const on = Math.round(p * (panels.length - 1));
        ticks.forEach((t, i) => t.classList.toggle('is-on', i === on));
        seqTicks.classList.toggle('is-dark', on % 2 === 1);
      }
    }

    const ar = aboutText.getBoundingClientRect();
    if (ar.bottom > 0 && ar.top < h) {
      const p = clamp((h * .82 - ar.top) / (ar.height * .95 + h * .1), 0, 1);
      const n = Math.round(p * words.length);
      if (n !== wordsOn) {
        const lo = Math.min(n, wordsOn), hi = Math.max(n, wordsOn);
        for (let i = lo; i < hi; i++) words[i].classList.toggle('on', n > wordsOn);
        wordsOn = n;
      }
    } else if (ar.top >= h && wordsOn) { words.forEach(w => w.classList.remove('on')); wordsOn = 0; }
    else if (ar.bottom <= 0 && wordsOn !== words.length) { words.forEach(w => w.classList.add('on')); wordsOn = words.length; }
  }
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', requestFrame, { passive: true });
  addEventListener('resize', requestFrame);
  frame();
  if (reduce) words.forEach(w => w.classList.add('on'));

  /* Opiniones: una sola cita protagonista que se desplaza con una cortina. */
  const quotes = $$('.quote');
  const vCount = $('.voices__count b');
  const vStage = $('[data-voices]');
  let q = 0, vTimer = 0, vHover = false, vVisible = false;

  function showQuote(to) {
    to = (to + quotes.length) % quotes.length;
    if (to === q) return;
    const prev = quotes[q], next = quotes[to];
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    prev.setAttribute('aria-hidden', 'true');
    setTimeout(() => prev.classList.remove('is-leaving'), 1000);
    next.classList.add('is-active');
    next.removeAttribute('aria-hidden');
    vCount.textContent = String(to + 1).padStart(2, '0');
    q = to;
    scheduleQuote();
  }
  function scheduleQuote() {
    clearTimeout(vTimer);
    if (reduce || vHover || !vVisible) return;
    vTimer = setTimeout(() => showQuote(q + 1), 9000);
  }
  $$('[data-vstep]').forEach(b => b.addEventListener('click', () => showQuote(q + Number(b.dataset.vstep))));
  vStage.addEventListener('pointerenter', () => { vHover = true; clearTimeout(vTimer); });
  vStage.addEventListener('pointerleave', () => { vHover = false; scheduleQuote(); });
  new IntersectionObserver(([en]) => { vVisible = en.isIntersecting; scheduleQuote(); }, { threshold: .4 }).observe(vStage);

  /* Sucursales: marca el día de hoy y el estado actual según la hora de Tlaxcala. */
  const HOURS = {
    chiautempan: { 0: [13, 20], 1: [9.5, 20], 2: [9.5, 20], 3: [9.5, 20], 4: [9.5, 20], 5: [9.5, 20], 6: [10, 20] },
    apizaco: { 0: [10, 20], 1: [9.5, 20], 2: [9.5, 20], 3: [9.5, 20], 4: [9.5, 20], 5: [9.5, 20], 6: [10, 20] }
  };
  const fmt = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
  (function paintHours() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(p => [p.type, p.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const now = Number(parts.hour) + Number(parts.minute) / 60;
    $$('[data-shop]').forEach(shop => {
      const table = HOURS[shop.dataset.shop];
      $$('[data-days]', shop).forEach(row => {
        const [a, b = a] = row.dataset.days.split('-').map(Number);
        row.classList.toggle('is-today', day >= a && day <= b);
      });
      const [open, close] = table[day];
      const state = $('[data-state]', shop);
      if (now >= open && now < close) state.textContent = `Abierto ahora · cierra a las ${fmt(close)}`;
      else if (now < open) state.textContent = `Cerrado ahora · abre hoy a las ${fmt(open)}`;
      else state.textContent = `Cerrado ahora · abre mañana a las ${fmt(table[(day + 1) % 7][0])}`;
    });
  })();

  /* Formulario de encargo plegable: cerrado por defecto; se abre al pedir. */
  const orderSec = $('#encargar');
  const orderBtn = $('#order-toggle');
  function setOrder(open, scroll) {
    orderSec.classList.toggle('is-open', open);
    orderBtn.setAttribute('aria-expanded', String(open));
    $('[data-label]', orderBtn).textContent = open ? 'Ocultar formulario' : 'Armar mi pedido';
    if (open && scroll) setTimeout(() => orderSec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 120);
  }
  orderBtn.addEventListener('click', () => setOrder(!orderSec.classList.contains('is-open'), false));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="#encargar"]');
    if (a) setOrder(true, false);
  });
  if (location.hash === '#encargar') setOrder(true, false);
  addEventListener('hashchange', () => { if (location.hash === '#encargar') setOrder(true, false); });

  /* Menú del pie: plegado en celular, abierto en escritorio. */
  const footNavs = $$('.foot__nav');
  const footMq = matchMedia('(max-width: 899px)');
  const syncFoot = () => footNavs.forEach(d => { d.open = !footMq.matches; });
  syncFoot();
  footMq.addEventListener('change', syncFoot);

  /* Calendario propio para la fecha del pedido. */
  const dateBtn = $('#date-btn');
  const dateVal = $('.datepick__val');
  const cal = $('#cal');
  const calGrid = $('.cal__grid');
  const calTitle = $('.cal__title');
  const dayFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(new Date());
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
  let viewY = today.getFullYear(), viewM = today.getMonth();
  let selected = null;
  let focusDate = today;
  let calOpen = false;

  dateVal.classList.add('is-empty');

  function renderCal(dir = 0) {
    calTitle.textContent = capital(monthFmt.format(new Date(viewY, viewM, 1)).replace(' de ', ' '));
    const lead = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
    const days = new Date(viewY, viewM + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div role="gridcell"></div>');
    for (let d = 1; d <= days; d++) {
      const date = new Date(viewY, viewM, d);
      const past = date < today;
      const isSel = selected && key(selected) === key(date);
      const isFocus = key(focusDate) === key(date);
      cells.push(`<div role="gridcell"${isSel ? ' aria-selected="true"' : ''}><button type="button" class="cal__day${key(date) === key(today) ? ' is-today' : ''}${isSel ? ' is-sel' : ''}" data-date="${key(date)}" aria-label="${dayFmt.format(date)}" tabindex="${isFocus && !past ? 0 : -1}"${past ? ' disabled' : ''}>${d}</button></div>`);
    }
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(`<div role="row" style="display:contents">${cells.slice(i, i + 7).join('')}</div>`);
    calGrid.dataset.dir = dir;
    calGrid.style.animation = 'none';
    calGrid.innerHTML = rows.join('');
    void calGrid.offsetWidth;
    calGrid.style.animation = '';
    const atMin = viewY === today.getFullYear() && viewM === today.getMonth();
    $('[data-cal="-1"]').disabled = atMin;
    $('[data-cal="-12"]').disabled = viewY <= today.getFullYear();
    if (!$('.cal__day[tabindex="0"]', calGrid)) {
      const first = $('.cal__day:not(:disabled)', calGrid);
      if (first) first.tabIndex = 0;
    }
  }

  function moveView(months, dir) {
    const d = new Date(viewY, viewM + months, 1);
    if (d < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    viewY = d.getFullYear(); viewM = d.getMonth();
    const day = Math.min(focusDate.getDate(), new Date(viewY, viewM + 1, 0).getDate());
    focusDate = new Date(viewY, viewM, day);
    if (focusDate < today) focusDate = today;
    renderCal(dir || (months > 0 ? 1 : -1));
  }

  function focusDay() { $('.cal__day[tabindex="0"]', calGrid)?.focus(); }

  function openCal() {
    if (calOpen) return;
    calOpen = true;
    const base = selected || today;
    viewY = base.getFullYear(); viewM = base.getMonth(); focusDate = base;
    renderCal(0);
    cal.hidden = false;
    dateBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { cal.classList.add('is-open'); setTimeout(focusDay, 120); });
  }
  function closeCal(returnFocus = true) {
    if (!calOpen) return;
    calOpen = false;
    cal.classList.remove('is-open');
    dateBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!calOpen) cal.hidden = true; }, 520);
    if (returnFocus) dateBtn.focus();
  }
  function pick(date) {
    selected = date;
    dateVal.textContent = capital(dayFmt.format(date));
    dateVal.classList.remove('is-empty');
    setError('fecha', '');
    closeCal();
  }

  dateBtn.addEventListener('click', () => (calOpen ? closeCal() : openCal()));
  cal.addEventListener('click', e => {
    const day = e.target.closest('.cal__day');
    if (day) { const [y, m, d] = day.dataset.date.split('-').map(Number); pick(new Date(y, m - 1, d)); return; }
    const step = e.target.closest('[data-cal]');
    if (step && !step.disabled) { moveView(Number(step.dataset.cal)); return; }
    if (e.target.closest('[data-cal-today]')) { viewY = today.getFullYear(); viewM = today.getMonth(); focusDate = today; renderCal(-1); focusDay(); }
    if (e.target.closest('[data-cal-close]')) closeCal();
  });
  document.addEventListener('pointerdown', e => { if (calOpen && !cal.contains(e.target) && !dateBtn.contains(e.target)) closeCal(false); });
  cal.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeCal(); return; }
    if (e.key === 'Tab') {
      const f = $$('button:not(:disabled)', cal).filter(b => b.tabIndex >= 0);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (!e.target.classList.contains('cal__day')) return;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let next = null;
    if (delta) next = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() + delta);
    else if (e.key === 'Home') next = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() - ((focusDate.getDay() + 6) % 7));
    else if (e.key === 'End') next = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() + (6 - (focusDate.getDay() + 6) % 7));
    else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      moveView((e.key === 'PageDown' ? 1 : -1) * (e.shiftKey ? 12 : 1));
      focusDay();
      return;
    }
    if (!next) return;
    e.preventDefault();
    if (next < today) return;
    const sameMonth = next.getMonth() === viewM && next.getFullYear() === viewY;
    focusDate = next;
    if (sameMonth) { $$('.cal__day', calGrid).forEach(b => { b.tabIndex = b.dataset.date === key(next) ? 0 : -1; }); focusDay(); }
    else { viewY = next.getFullYear(); viewM = next.getMonth(); renderCal(next > new Date(viewY, viewM, 1) ? 1 : -1); focusDay(); }
  });

  /* Formulario: valida y arma un resumen. No envía datos a ningún servidor. */
  const form = $('#order-form');
  const summary = $('#summary');
  const summaryText = $('#summary-text');
  const copyOk = $('#copy-ok');

  function setError(name, msg) {
    const el = $(`[data-err="${name}"]`, form);
    if (el) el.textContent = msg;
  }
  const radio = name => form.querySelector(`input[name="${name}"]:checked`)?.value;
  $$('input[type="radio"]', form).forEach(r => r.addEventListener('change', () => setError(r.name, '')));
  $$('input[type="text"], input[type="tel"]', form).forEach(i => i.addEventListener('input', () => setError('contacto', '')));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      ocasion: radio('ocasion'), tamano: radio('tamano'),
      nombre: form.nombre.value.trim(), telefono: form.telefono.value.trim(), detalles: form.detalles.value.trim()
    };
    const errors = [];
    if (!data.ocasion) errors.push(['ocasion', 'Elige una ocasión.', $('input[name="ocasion"]', form)]);
    if (!data.tamano) errors.push(['tamano', 'Elige un tamaño aproximado.', $('input[name="tamano"]', form)]);
    if (!selected) errors.push(['fecha', 'Elige una fecha en el calendario.', dateBtn]);
    if (!data.nombre || data.telefono.replace(/\D/g, '').length < 8) {
      errors.push(['contacto', 'Escribe tu nombre y un teléfono de al menos 8 dígitos.', !data.nombre ? form.nombre : form.telefono]);
    }
    ['ocasion', 'tamano', 'fecha', 'contacto'].forEach(n => setError(n, ''));
    errors.forEach(([n, m]) => setError(n, m));
    if (errors.length) { setOrder(true, false); summary.hidden = true; errors[0][2].focus(); return; }

    summaryText.textContent = [
      `Ocasión: ${data.ocasion}`,
      `Tamaño: ${data.tamano}`,
      `Fecha deseada: ${capital(dayFmt.format(selected))}`,
      `Nombre: ${data.nombre}`,
      `Teléfono: ${data.telefono}`,
      quote.length ? `Productos:\n${quote.map(q => `• ${q.qty} × ${byId[q.id].name}`).join('\n')}${estimate().priced ? `\nEstimado con precios publicados: ${money(estimate().total)}` : ''}` : null,
      noteEl.value.trim() ? `Nota: ${noteEl.value.trim()}` : null,
      data.detalles ? `Detalles: ${data.detalles}` : null,
      '',
      'Sucursales: Chiautempan y Apizaco · 246 427 2786'
    ].filter(l => l !== null).join('\n');
    $('#wa-summary').href = waUrl('Hola, quiero hacer un pedido:\n' + summaryText.textContent);
    summary.hidden = false;
    copyOk.textContent = '';
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  $('#copy-summary').addEventListener('click', async () => {
    const text = summaryText.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    copyOk.textContent = 'Resumen copiado.';
  });

  /* Inclinación del hero con el puntero y botones magnéticos. */
  if (finePointer && !reduce) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      stage.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      stage.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
    $$('.btn--wine, .btn--cream').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate3d(${((e.clientX - r.left - r.width / 2) * .18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * .3).toFixed(1)}px, 0)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }


  /* Catálogo, vista de producto y cotización. El catálogo del HTML es la única fuente de datos. */
  const catRows = $$('.cat__row');
  const PRODUCTS = catRows.map(li => ({ id: li.dataset.id, name: li.dataset.name, cat: li.dataset.cat, label: li.dataset.catLabel, img: li.dataset.img, desc: li.dataset.desc, price: li.dataset.price }));
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  let quote = [];
  try { quote = JSON.parse(localStorage.getItem('tym-quote') || '[]').filter(q => byId[q.id] && q.qty > 0); } catch { quote = []; }

  const toast = $('#toast');
  const fab = $('#qfab');
  const pd = $('#pd');
  const qd = $('#qd');
  let toastTimer = 0;
  const say = (msg, action) => {
    toast.textContent = msg;
    toast.classList.toggle('has-action', !!action);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', () => { action.run(); toast.classList.remove('is-on'); });
      toast.appendChild(b);
    }
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), action ? 5200 : 2600);
  };
  const persist = () => { try { localStorage.setItem('tym-quote', JSON.stringify(quote)); } catch { /* sin almacenamiento */ } };
  const totalQty = () => quote.reduce((n, q) => n + q.qty, 0);
  const small = s => s.replace(/(img\/(?:cut|photo)\/)/, '$1t/');
  const thumb = (p, cls) => p.img ? `<span class="${cls}"><img src="${small(p.img)}" alt="" width="64" height="64"></span>` : `<span class="${cls} ${cls}--empty"></span>`;
  const money = n => '$' + n.toLocaleString('es-MX') + ' MXN';
  const noteEl = $('#qd-note');
  try { noteEl.value = localStorage.getItem('tym-quote-note') || ''; } catch { /* sin almacenamiento */ }
  noteEl.addEventListener('input', () => { try { localStorage.setItem('tym-quote-note', noteEl.value); } catch { /* sin almacenamiento */ } });

  function estimate() {
    let total = 0, pending = 0;
    quote.forEach(q => { const p = byId[q.id]; if (p.price) total += Number(p.price) * q.qty; else pending += q.qty; });
    return { total, pending, priced: total > 0 };
  }
  function quoteText() {
    const e = estimate();
    const lines = ['Mi cotización · Trigo y Miel', ...quote.map(q => `• ${q.qty} × ${byId[q.id].name}${byId[q.id].price ? ` (${money(Number(byId[q.id].price))} c/u)` : ''}`)];
    if (e.priced) lines.push(`Estimado con precios publicados: ${money(e.total)}${e.pending ? ` + ${e.pending} por confirmar` : ''}`);
    if (noteEl.value.trim()) lines.push(`Nota: ${noteEl.value.trim()}`);
    lines.push('Precios y disponibilidad: por confirmar en sucursal.');
    return lines.join('\n');
  }

  const waUrl = t => 'https://wa.me/522464272786?text=' + encodeURIComponent(t);
  function renderQuote() {
    const n = totalQty();
    const qc = $('[data-qcount]', fab);
    qc.textContent = n;
    qc.toggleAttribute('data-zero', !n);
    fab.classList.toggle('has-items', n > 0);
    $('.qfab__stack', fab).innerHTML = quote.slice(0, 3).map(q => byId[q.id].img ? `<img src="${small(byId[q.id].img)}" alt="">` : '').join('');
    $('#qd-sub').textContent = `${n} ${n === 1 ? 'producto' : 'productos'}`;
    requestFrame();
    fab.setAttribute('aria-label', `Mi cotización, ${n} ${n === 1 ? 'producto' : 'productos'}`);
    qd.classList.toggle('is-empty', !quote.length);
    $('#qd-list').innerHTML = quote.map(q => {
      const p = byId[q.id];
      const unit = p.price ? Number(p.price) : 0;
      return `<li data-id="${p.id}">${thumb(p, 'qd__thumb')}
        <div class="qd__info"><p class="qd__name">${p.name}</p><p class="qd__cat">${p.label}${unit ? ` · ${money(unit)} c/u` : ' · precio por confirmar'}</p></div>
        <div class="qd__row2"><div class="step"><button type="button" data-q="-1" aria-label="Quitar uno de ${p.name}">−</button><span aria-live="polite">${q.qty}</span><button type="button" data-q="1" aria-label="Agregar uno de ${p.name}">+</button></div>
        <p class="qd__line">${unit ? money(unit * q.qty) : 'Por confirmar'}</p></div>
        <button type="button" class="qd__rm" data-q-rm aria-label="Quitar ${p.name} de la cotización"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 5l14 14M19 5L5 19"/></svg></button></li>`;
    }).join('');
    $('#wa-quote').href = waUrl('Hola, quiero cotizar:\n' + quoteText());
    const e = estimate();
    $('#qd-total').textContent = e.priced ? money(e.total) : 'Por confirmar';
    $('#qd-total-note').textContent = e.priced
      ? (e.pending ? `Más ${e.pending} ${e.pending === 1 ? 'producto' : 'productos'} sin precio publicado. Es solo una referencia: la sucursal confirma el costo final.` : 'Es solo una referencia: la sucursal confirma el costo final y la disponibilidad.')
      : 'Ningún producto tiene precio publicado. La sucursal te confirma costo y disponibilidad.';
    $('#form-prods').innerHTML = quote.length
      ? quote.map(q => `<li>${q.qty} × ${byId[q.id].name}</li>`).join('')
      : '<li class="prods__empty">Todavía no eliges productos. Puedes pedir un diseño libre.</li>';
    syncPdState();
  }

  function addToQuote(id, qty = 1) {
    const item = quote.find(q => q.id === id);
    if (item) item.qty = Math.min(20, item.qty + qty); else quote.push({ id, qty });
    persist(); renderQuote();
    fab.classList.remove('is-bump'); void fab.offsetWidth; fab.classList.add('is-bump');
    say(`Agregado a tu cotización: ${byId[id].name}`);
  }
  function setQty(id, qty) {
    const idx = quote.findIndex(q => q.id === id);
    if (idx < 0) return;
    const before = { ...quote[idx] };
    quote[idx].qty = clamp(qty, 0, 20);
    if (!quote[idx].qty) {
      quote.splice(idx, 1);
      persist(); renderQuote();
      say(`Quitaste ${byId[id].name}`, { label: 'Deshacer', run: () => { quote.splice(Math.min(idx, quote.length), 0, before); persist(); renderQuote(); } });
      return;
    }
    persist(); renderQuote();
  }

  /* Diálogos con salida animada */
  function openDlg(d) {
    if (!d.open) d.showModal();
    document.documentElement.classList.add('modal-open');
    requestAnimationFrame(() => d.classList.add('is-in'));
  }
  function closeDlg(d, after) {
    if (!d.open) { after?.(); return; }
    d.classList.remove('is-in');
    d.classList.add('is-out');
    setTimeout(() => { d.close(); d.classList.remove('is-out'); if (!$('dialog[open]')) document.documentElement.classList.remove('modal-open'); after?.(); }, 240);
  }
  const infoDlgs = $$('dialog.id');
  [pd, qd, ...infoDlgs].forEach(d => {
    d.addEventListener('cancel', e => { e.preventDefault(); closeDlg(d); });
    d.addEventListener('click', e => { if (e.target === d) closeDlg(d); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => closeDlg(d, () => { if (b.dataset.goto) $(b.dataset.goto)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); })));
  });

  /* Precarga de las fotos de producto en reposo, para que la ficha abra al instante. */
  (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => PRODUCTS.forEach(p => { if (p.img) new Image().src = p.img; }));
  document.addEventListener('pointerover', e => { const t = e.target.closest('[data-open]'); if (t && byId[t.dataset.open]?.img) new Image().src = byId[t.dataset.open].img; }, { passive: true });

  /* Producto por separado */
  let pdIndex = 0;
  const pdImg = $('.pd__img');
  function fillProduct(i, flipFrom, dir = 0) {
    pdIndex = (i + PRODUCTS.length) % PRODUCTS.length;
    const p = PRODUCTS[pdIndex];
    pd.dataset.cat = p.cat;
    $('.pd__cat').textContent = p.label;
    $('.pd__name').textContent = p.name;
    $('.pd__desc').textContent = p.desc;
    $('.pd__price').textContent = p.price ? `MXN ${p.price} · precio de su menú en Google` : 'Consúltalo en sucursal';
    $('.pd__n').textContent = `${String(pdIndex + 1).padStart(2, '0')} / ${String(PRODUCTS.length).padStart(2, '0')}`;
    const noPhoto = !p.img;
    pd.classList.toggle('is-ph', noPhoto);
    $('.pd__ph').hidden = !noPhoto;
    $('.pd__ph-cat').textContent = p.name;
    pdImg.hidden = noPhoto;
    if (!noPhoto) { pdImg.src = p.img; pdImg.alt = p.name; pdImg.classList.toggle('is-photo', p.img.includes('/photo/')); }
    [1, -1].forEach(s => { const q = PRODUCTS[(pdIndex + s + PRODUCTS.length) % PRODUCTS.length]; if (q.img) new Image().src = q.img; });
    syncPdState();
    history.replaceState(null, '', '#p-' + p.id);
    if (reduce || noPhoto) return;
    if (flipFrom) {
      requestAnimationFrame(() => {
        const a = flipFrom.getBoundingClientRect(), b = pdImg.getBoundingClientRect();
        if (!a.width || !b.width) return;
        pdImg.animate([
          { transform: `translate(${a.left + a.width / 2 - b.left - b.width / 2}px, ${a.top + a.height / 2 - b.top - b.height / 2}px) scale(${a.width / b.width}) rotate(-12deg)`, opacity: .4 },
          { transform: 'none', opacity: 1 }
        ], { duration: 380, easing: 'cubic-bezier(.22,.8,.3,1)' });
      });
    } else if (dir) {
      pdImg.animate([{ transform: `translateX(${dir * 70}px) rotate(${dir * 16}deg) scale(.9)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }
  function syncPdState() {
    const p = PRODUCTS[pdIndex];
    const item = quote.find(q => q.id === p.id);
    $('[data-pd-add]').textContent = item ? 'Agregar otro a mi cotización' : 'Agregar a mi cotización';
    $('.pd__state').textContent = item ? `Ya tienes ${item.qty} en tu cotización.` : '';
  }
  function openProduct(id, from) {
    const i = PRODUCTS.findIndex(p => p.id === id);
    if (i < 0) return;
    const src = from && (from.matches('img') ? from : $('img', from) || from.closest('figure, article, li, .disc')?.querySelector('img'));
    fillProduct(i, src && src.complete ? src : null);
    openDlg(pd);
  }
  function closeProduct() {
    closeDlg(pd, () => history.replaceState(null, '', location.pathname + location.search));
  }
  pd.addEventListener('cancel', () => history.replaceState(null, '', location.pathname + location.search));
  $$('[data-close]', pd).forEach(b => b.addEventListener('click', () => history.replaceState(null, '', location.pathname + location.search)));
  $$('[data-pd]').forEach(b => b.addEventListener('click', () => fillProduct(pdIndex + Number(b.dataset.pd), null, Number(b.dataset.pd))));
  $('[data-pd-add]').addEventListener('click', () => addToQuote(PRODUCTS[pdIndex].id));
  $('[data-pd-order]').addEventListener('click', () => {
    const id = PRODUCTS[pdIndex].id;
    if (!quote.some(q => q.id === id)) addToQuote(id);
    closeProduct();
    setOrder(true, true);
  });
  pd.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') fillProduct(pdIndex + 1, null, 1);
    if (e.key === 'ArrowLeft') fillProduct(pdIndex - 1, null, -1);
  });

  /* Cotización */
  function openQuote() { renderQuote(); openDlg(qd); }
  fab.addEventListener('click', openQuote);
  qd.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]');
    if (li && e.target.closest('[data-q]')) setQty(li.dataset.id, quote.find(q => q.id === li.dataset.id).qty + Number(e.target.closest('[data-q]').dataset.q));
    else if (li && e.target.closest('[data-q-rm]')) setQty(li.dataset.id, 0);
  });
  $('[data-qd-continue]').addEventListener('click', () => {
    closeDlg(qd, () => setOrder(true, true));
  });
  const clearBtn = $('#qd-clear');
  let clearTimer = 0;
  clearBtn.addEventListener('click', () => {
    if (!clearBtn.classList.contains('is-armed')) {
      clearBtn.classList.add('is-armed'); clearBtn.textContent = '¿Vaciar todo?';
      clearTimer = setTimeout(() => { clearBtn.classList.remove('is-armed'); clearBtn.textContent = 'Vaciar'; }, 3000);
      return;
    }
    clearTimeout(clearTimer);
    clearBtn.classList.remove('is-armed'); clearBtn.textContent = 'Vaciar';
    const old = quote.map(q => ({ ...q }));
    quote = []; persist(); renderQuote();
    say('Vaciaste tu cotización', { label: 'Deshacer', run: () => { quote = old; persist(); renderQuote(); } });
  });
  $('#qd-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(quoteText()); $('#qd-ok').textContent = 'Lista copiada.'; } catch { $('#qd-ok').textContent = 'No se pudo copiar.'; }
  });
  const shareBtn = $('#qd-share');
  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', () => navigator.share({ title: 'Mi cotización · Trigo y Miel', text: quoteText() }).catch(() => {}));
  }

  /* Un solo punto de entrada para abrir y cotizar desde cualquier parte */
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { addToQuote(add.dataset.add); return; }
    if (e.target.closest('[data-open-quote]')) { openQuote(); return; }
    const info = e.target.closest('[data-info]');
    if (info) { openDlg($('#' + info.dataset.info)); return; }
    const open = e.target.closest('[data-open]');
    if (open) openProduct(open.dataset.open, open.matches('.piece__open') ? open.closest('figure').querySelector('img') : open);
  });
  $$('[role="button"][data-open]').forEach(el => el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(el.dataset.open, el); }
  }));

  /* Filtros del catálogo */
  const catList = $('.cat__list');
  const chips = $$('.chip');
  const catCount = $('.cat__count');
  function filterCat(f) {
    let n = 0;
    catRows.forEach(li => {
      const on = f === 'todos' || li.dataset.cat === f;
      li.hidden = !on;
      if (on) { li.style.setProperty('--d', Math.min(n, 14) * 45 + 'ms'); n++; }
    });
    chips.forEach(ch => { const on = ch.dataset.filter === f; ch.classList.toggle('is-on', on); ch.setAttribute('aria-pressed', String(on)); });
    catCount.textContent = `${n} ${n === 1 ? 'producto' : 'productos'}`;
    catList.classList.remove('is-anim'); void catList.offsetWidth; catList.classList.add('is-anim');
  }
  chips.forEach(ch => ch.addEventListener('click', () => filterCat(ch.dataset.filter)));
  catCount.textContent = `${catRows.length} productos`;
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { catList.classList.add('is-anim'); o.disconnect(); } }, { threshold: .08 }).observe(catList);

  /* Enlace directo a un producto: index.html#p-limon */
  const fromHash = () => { const m = location.hash.match(/^#p-(.+)$/); if (m && byId[m[1]] && !pd.open) { fillProduct(PRODUCTS.findIndex(p => p.id === m[1])); openDlg(pd); } };
  addEventListener('hashchange', fromHash);
  setTimeout(fromHash, 1900);
  renderQuote();

  /* Más movimiento: letras con ola en la secuencia, palabras en las citas e inclinación de piezas. */
  $$('.seq__word').forEach(w => { w.innerHTML = [...w.textContent].map((ch, i) => `<span class="lt" style="--i:${i}">${ch}</span>`).join(''); });
  $$('.quote p').forEach(p => { p.innerHTML = p.textContent.trim().split(/\s+/).map((w, i) => `<span class="qw" style="--i:${i}">${w}</span>`).join(' '); });
  if (finePointer && !reduce) {
    $$('.collage .piece').forEach(pc => {
      const box = $('.piece__img', pc);
      pc.addEventListener('pointermove', e => {
        const r = pc.getBoundingClientRect();
        box.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 9).toFixed(2) + 'deg');
        box.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - .5) * 9).toFixed(2) + 'deg');
      });
      pc.addEventListener('pointerleave', () => { box.style.setProperty('--rx', '0deg'); box.style.setProperty('--ry', '0deg'); });
    });
  }

  /* Cursor discreto: solo con puntero fino. */
  if (finePointer && !reduce) {
    const cur = $('.cursor');
    let cx = 0, cy = 0, mx = 0, my = 0, run = 0;
    const loop = () => {
      cx += (mx - cx) * .25; cy += (my - cy) * .25;
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      run = Math.abs(mx - cx) + Math.abs(my - cy) > .3 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      cur.classList.add('is-on');
      if (!run) run = requestAnimationFrame(loop);
    });
    document.addEventListener('pointerover', e => cur.classList.toggle('is-view', !!e.target.closest('[data-cursor]')));
    document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  }

  /* Sonido de bienvenida: intenta sonar solo y reintenta con cualquier señal hasta que el navegador lo permita. */
  const AC = window.AudioContext || window.webkitAudioContext;
  let audio = null;
  let played = false;
  function chime() {
    played = true;
    const t0 = audio.currentTime + .03;
    const master = audio.createGain();
    master.gain.value = .9;
    const comp = audio.createDynamicsCompressor();
    master.connect(comp).connect(audio.destination);
    [[523.25, 0], [659.25, .15], [783.99, .3], [1046.5, .46], [1318.5, .62]].forEach(([f, d]) => {
      [[f, .34], [f * 2, .1]].forEach(([fr, vol]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = fr;
        g.gain.setValueAtTime(0, t0 + d);
        g.gain.linearRampToValueAtTime(vol, t0 + d + .015);
        g.gain.exponentialRampToValueAtTime(.0001, t0 + d + 1.9);
        o.connect(g).connect(master);
        o.start(t0 + d); o.stop(t0 + d + 2);
      });
    });
  }
  const signals = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click', 'wheel', 'scroll', 'mousemove', 'touchmove', 'focus'];
  function tryChime() {
    if (played || !AC) return;
    audio = audio || new AC();
    audio.resume().then(() => {
      if (audio.state === 'running' && !played) {
        signals.forEach(t => removeEventListener(t, tryChime, true));
        document.removeEventListener('visibilitychange', tryChime);
        chime();
      }
    }).catch(() => {});
  }
  signals.forEach(t => addEventListener(t, tryChime, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', tryChime);
  tryChime();

  /* Volver arriba */
  toTop.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    $('.brand').focus({ preventScroll: true });
  });
})();
