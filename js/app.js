/* Choose Seats — vanilla JS, sin dependencias. */
(function () {
  'use strict';

  var MAX = 4;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var ROWS_PER_SECTION = 8;

  /* Posición de cada letra en la grilla. El 4 es el pasillo. */
  var LETTER_POS = { A: 1, B: 2, C: 3, D: 5, E: 6, F: 7 };

  var SECTIONS = [
    { n: 1, key: 'business', price: 480 },
    { n: 2, key: 'premium',  price: 320 },
    { n: 3, key: 'economy',  price: 190 }
  ];

  var TOTAL_ROWS = SECTIONS.length * ROWS_PER_SECTION;
  var ROW_X0 = 155;    /* coordenadas del viewBox del avión */
  var ROW_X1 = 795;

  var I18N = {
    es: {
      title: 'Elegir asientos', checkin: 'Check-in abierto', back: 'Volver',
      legFree: 'Disponible', legBusy: 'Ocupado', legSel: 'Tu selección',
      total: 'Total', confirm: 'Confirmar',
      business: 'Business Class', premium: 'Premium Economy', economy: 'Económica',
      section: 'Sección', free: 'libres', perSeat: '/ asiento',
      empty: 'Ningún asiento elegido',
      promo: 'Recorre la cabina en tres dimensiones antes de elegir. Solo en pantallas grandes.',
      seat: 'Asiento {s}', taken: 'Asiento {s}, ocupado',
      swap: 'Solo van 4 puestos: {a} salió y entró {b}.',
      ok: 'Reservado: {s} por {t}.'
    },
    en: {
      title: 'Choose Seats', checkin: 'Check-in open', back: 'Back',
      legFree: 'Available', legBusy: 'Taken', legSel: 'Your pick',
      total: 'Total', confirm: 'Confirm',
      business: 'Business Class', premium: 'Premium Economy', economy: 'Economy',
      section: 'Section', free: 'free', perSeat: '/ seat',
      empty: 'No seats picked',
      promo: 'Walk the cabin in 3D before you pick. Large screens only.',
      seat: 'Seat {s}', taken: 'Seat {s}, taken',
      swap: 'Only 4 seats: {a} was dropped for {b}.',
      ok: 'Booked: {s} for {t}.'
    }
  };

  var lang = 'es';
  var active = 0;            /* índice de la sección visible */
  var picked = [];           /* FIFO, el más viejo primero */
  var shown = 0;             /* lo que el contador está mostrando */
  var frame = null;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    map: $('map'), seg: $('seg'), secName: $('secName'), secStat: $('secStat'),
    pin: $('pin'), pinRow: $('pinRow'), zone: $('zone'), ports: $('ports'),
    chipsDesk: $('chipsDesk'), chipsMob: $('chipsMob'),
    totalDesk: $('totalDesk'), totalMob: $('totalMob'),
    nDesk: $('nDesk'), nMob: $('nMob'),
    ctaDesk: $('ctaDesk'), ctaMob: $('ctaMob'),
    toast: $('toast'), lang: $('lang'), back: $('back')
  };
  var svg = document.querySelector('.plane');
  var stage = document.querySelector('.stage');

  /* ---------- helpers ---------- */

  function t(k) { return (I18N[lang] && I18N[lang][k]) || k; }
  function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  /* Ocupados fijos: el mapa se ve igual en cada recarga y en el proyector. */
  function isTaken(row, letter) {
    var h = row * 374761393 + letter.charCodeAt(0) * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) % 100 < 30;
  }

  function sectionOfRow(row) {
    return SECTIONS[Math.floor((row - 1) / ROWS_PER_SECTION)];
  }

  function rowsOf(index) {
    var first = index * ROWS_PER_SECTION + 1;
    var out = [];
    for (var i = 0; i < ROWS_PER_SECTION; i++) out.push(first + i);
    return out;
  }

  function seatEl(id) { return el.map.querySelector('[data-seat="' + id + '"]'); }

  /* Centro de una fila, en coordenadas del viewBox. */
  function rowX(row) {
    return ROW_X0 + (ROW_X1 - ROW_X0) * ((row - 0.5) / TOTAL_ROWS);
  }

  /* viewBox -> píxeles dentro del escenario, respetando el escalado del SVG. */
  function toPx(x) {
    var ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    var p = svg.createSVGPoint();
    p.x = x; p.y = 0;
    return p.matrixTransform(ctm).x - stage.getBoundingClientRect().left;
  }

  /* ---------- avión ---------- */

  function drawPorts() {
    var out = '';
    for (var r = 1; r <= TOTAL_ROWS; r++) {
      out += '<circle cx="' + rowX(r).toFixed(1) + '" cy="105" r="4"/>';
    }
    el.ports.innerHTML = out;
  }

  function placeZone() {
    var rows = rowsOf(active);
    var a = toPx(rowX(rows[0]) - 14);
    var b = toPx(rowX(rows[rows.length - 1]) + 14);
    el.zone.style.left = a + 'px';
    el.zone.style.width = Math.max(0, b - a) + 'px';
  }

  /* La animación: se mueve `left`, así el trayecto se ve. */
  function placePin(row) {
    el.pin.style.left = toPx(rowX(row)) + 'px';
    el.pinRow.textContent = row;
    el.pin.classList.add('on');
  }

  /* ---------- construir el mapa ---------- */

  function buildMap() {
    var frag = document.createDocumentFragment();
    var rows = rowsOf(active);

    LETTERS.forEach(function (letter) {
      var tag = document.createElement('span');
      tag.className = 'tag tag--letter';
      tag.style.setProperty('--lp', LETTER_POS[letter]);
      tag.textContent = letter;
      frag.appendChild(tag);
    });

    rows.forEach(function (row, i) {
      var tag = document.createElement('span');
      tag.className = 'tag tag--row';
      tag.style.setProperty('--rp', i + 1);
      tag.textContent = row;
      frag.appendChild(tag);

      LETTERS.forEach(function (letter) {
        var id = row + letter;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'seat';
        b.dataset.seat = id;
        b.dataset.row = row;
        b.style.setProperty('--lp', LETTER_POS[letter]);
        b.style.setProperty('--rp', i + 1);
        b.textContent = id;

        if (isTaken(row, letter)) {
          b.disabled = true;
          b.setAttribute('aria-label', fill(t('taken'), { s: id }));
        } else {
          b.setAttribute('aria-pressed', picked.indexOf(id) !== -1 ? 'true' : 'false');
          b.setAttribute('aria-label', fill(t('seat'), { s: id }));
        }

        frag.appendChild(b);
      });
    });

    el.map.innerHTML = '';
    el.map.appendChild(frag);
  }

  function freeCount() {
    var n = 0;
    rowsOf(active).forEach(function (row) {
      LETTERS.forEach(function (letter) { if (!isTaken(row, letter)) n++; });
    });
    return n;
  }

  /* ---------- secciones ---------- */

  function buildSeg() {
    el.seg.innerHTML = '';
    SECTIONS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg__b';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === active ? 'true' : 'false');
      b.textContent = s.n;
      b.addEventListener('click', function () { show(i); });
      el.seg.appendChild(b);
    });
  }

  function show(i) {
    active = i;
    [].forEach.call(el.seg.children, function (b, k) {
      b.setAttribute('aria-selected', k === i ? 'true' : 'false');
    });
    buildMap();
    renderHead();
    placeZone();
  }

  function renderHead() {
    var s = SECTIONS[active];
    el.secName.textContent = t('section') + ' ' + s.n + ' (' + t(s.key) + ')';
    el.secStat.textContent = freeCount() + ' ' + t('free') + ' · ' + money(s.price) + ' ' + t('perSeat');
  }

  /* ---------- selección: 4 máximo, el quinto saca al más viejo ---------- */

  function toggle(id) {
    var at = picked.indexOf(id);

    if (at !== -1) {
      picked.splice(at, 1);
      mark(id, false);
      render();
      return;
    }

    var out = null;
    if (picked.length >= MAX) {
      out = picked.shift();
      mark(out, false);
      bump(out, 'drop');
    }

    picked.push(id);
    mark(id, true);
    bump(id, 'pop');
    placePin(parseInt(id, 10));
    render();

    if (out) toast(fill(t('swap'), { a: out, b: id }));
  }

  function mark(id, on) {
    var s = seatEl(id);
    if (s) s.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function bump(id, cls) {
    var s = seatEl(id);
    if (!s) return;
    s.classList.remove('pop', 'drop');
    void s.offsetWidth;
    s.classList.add(cls);
  }

  /* ---------- el total cuenta, no salta ---------- */

  function countTo(target) {
    if (frame) cancelAnimationFrame(frame);

    var from = shown;
    var d = target - from;
    if (d === 0) return;

    /* Una pestaña en segundo plano no recibe frames: ahí se pone el valor final. */
    if (document.hidden) {
      shown = target;
      el.totalDesk.textContent = money(target);
      el.totalMob.textContent = money(target);
      return;
    }

    var t0 = performance.now();

    frame = requestAnimationFrame(function step(now) {
      var p = Math.min(1, (now - t0) / 480);
      shown = from + d * (1 - Math.pow(1 - p, 3));
      el.totalDesk.textContent = money(shown);
      el.totalMob.textContent = money(shown);
      if (p < 1) frame = requestAnimationFrame(step);
      else { shown = target; frame = null; }
    });
  }

  /* ---------- fichas y totales ---------- */

  function sum() {
    return picked.reduce(function (a, id) {
      return a + sectionOfRow(parseInt(id, 10)).price;
    }, 0);
  }

  function chips(box, dark) {
    box.innerHTML = '';

    if (!picked.length) {
      var e = document.createElement('span');
      e.className = 'chip chip--empty' + (dark ? ' chip--dark' : '');
      e.textContent = t('empty');
      box.appendChild(e);
      return;
    }

    picked.forEach(function (id) {
      var c = document.createElement('span');
      c.className = 'chip' + (dark ? ' chip--dark' : '');
      c.textContent = id;

      var x = document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.setAttribute('aria-label', id);
      x.addEventListener('click', function () { toggle(id); });
      c.appendChild(x);

      box.appendChild(c);
    });
  }

  function render() {
    chips(el.chipsDesk, false);
    chips(el.chipsMob, true);

    el.nDesk.textContent = picked.length;
    el.nMob.textContent = picked.length;
    el.ctaDesk.disabled = picked.length === 0;
    el.ctaMob.disabled = picked.length === 0;

    if (!picked.length) {
      el.pin.classList.remove('on');
    }

    countTo(sum());
  }

  /* ---------- aviso ---------- */

  var timer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(function () { el.toast.classList.remove('on'); }, 2800);
  }

  /* ---------- idioma ---------- */

  function applyLang() {
    document.documentElement.lang = lang;
    el.lang.textContent = lang === 'es' ? 'EN' : 'ES';
    document.title = t('title') + ' — AV 8420';

    document.querySelectorAll('[data-i18n]').forEach(function (n) {
      n.textContent = t(n.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (n) {
      n.setAttribute('aria-label', t(n.dataset.i18nAria));
    });

    buildMap();
    renderHead();
    render();
  }

  /* ---------- cableado ---------- */

  el.map.addEventListener('click', function (e) {
    var s = e.target.closest('.seat');
    if (s && !s.disabled) toggle(s.dataset.seat);
  });

  el.lang.addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es';
    applyLang();
  });

  el.back.addEventListener('click', function () { history.back(); });

  [el.ctaDesk, el.ctaMob].forEach(function (b) {
    b.addEventListener('click', function () {
      if (picked.length) toast(fill(t('ok'), { s: picked.join(', '), t: money(sum()) }));
    });
  });

  /* El pin y la franja están en píxeles: tienen que seguir al resize. */
  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      placeZone();
      if (picked.length) placePin(parseInt(picked[picked.length - 1], 10));
    }, 120);
  });

  drawPorts();
  buildSeg();
  buildMap();
  applyLang();
  requestAnimationFrame(placeZone);
  setTimeout(placeZone, 120);   /* por si el SVG aún no tiene tamaño */
})();
