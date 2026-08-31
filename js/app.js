/* Choose Seats — vanilla JS, sin dependencias. */
(function () {
  'use strict';

  var MAX = 4;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var ROWS = 8;

  /* Posición de cada letra en la grilla. El 4 es el pasillo. */
  var LP = { A: 1, B: 2, C: 3, D: 5, E: 6, F: 7 };

  var SECTIONS = [
    { n: 1, key: 'business', price: 480 },
    { n: 2, key: 'premium',  price: 260 },
    { n: 3, key: 'economy',  price: 160 }
  ];

  var TOTAL_ROWS = SECTIONS.length * ROWS;
  var X0 = 170, X1 = 900;     /* extremos de la cabina en el viewBox del avión */

  var T = {
    title: 'Choose Seats', checkin: 'Check-in abierto', back: 'Volver',
    legFree: 'Disponible', legBusy: 'Ocupado', legSel: 'Tu selección',
    total: 'TOTAL', confirm: 'Confirmar',
    business: 'Business Class', premium: 'Premium Economy', economy: 'Económica',
    shortBusiness: 'Business', shortPremium: 'Premium', shortEconomy: 'Económica',
    section: 'Section', sec: 'Sec', free: 'libres', per: '/ asiento',
    empty: 'Ningún asiento elegido',
    promo: 'Recorre la cabina de tu avión con visualización 3D y siente lo que te espera a bordo.',
    seat: 'Asiento {s}', taken: 'Asiento {s}, ocupado',
    swap: 'Solo van 4 puestos: {a} salió y entró {b}.',
    ok: 'Reservado: {s} por {t}.'
  };

  var active = 0;
  var picked = [];        /* FIFO: el más viejo primero */
  var shown = 0;
  var frame = null;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    map: $('map'), seg: $('seg'), secShort: $('secShort'), secLong: $('secLong'), secStat: $('secStat'),
    pin: $('pin'), pinRow: $('pinRow'), zone: $('zone'), zoneTag: $('zoneTag'), ports: $('ports'),
    chipsDesk: $('chipsDesk'), chipsMob: $('chipsMob'),
    totalDesk: $('totalDesk'), totalMob: $('totalMob'),
    nDesk: $('nDesk'), nMob: $('nMob'), ctaDesk: $('ctaDesk'), ctaMob: $('ctaMob'),
    toast: $('toast'), back: $('back')
  };
  var svg = document.querySelector('.plane');
  var stage = document.querySelector('.stage');

  /* ---------- helpers ---------- */

  function t(k) { return T[k] || k; }
  function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Ocupados fijos: el mapa se ve igual en cada recarga y en el proyector. */
  function isTaken(row, letter) {
    var h = row * 374761393 + letter.charCodeAt(0) * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) % 100 < 26;
  }

  function sectionOfRow(row) { return SECTIONS[Math.floor((row - 1) / ROWS)]; }

  function rowsOf(i) {
    var first = i * ROWS + 1, out = [];
    for (var k = 0; k < ROWS; k++) out.push(first + k);
    return out;
  }

  function seatEl(id) { return el.map.querySelector('[data-seat="' + id + '"]'); }

  function rowX(row) { return X0 + (X1 - X0) * ((row - 0.5) / TOTAL_ROWS); }

  /* viewBox -> píxeles del escenario, respetando el escalado del SVG. */
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
    for (var r = 1; r <= TOTAL_ROWS; r++) out += '<circle cx="' + rowX(r).toFixed(1) + '" cy="120" r="4.5"/>';
    el.ports.innerHTML = out;
  }

  function placeZone() {
    var rows = rowsOf(active);
    var a = toPx(rowX(rows[0]) - 16);
    var b = toPx(rowX(rows[rows.length - 1]) + 16);
    el.zone.style.left = a + 'px';
    el.zone.style.width = Math.max(0, b - a) + 'px';

    /* El alto sale del fuselaje dibujado, no de un porcentaje del contenedor:
       el SVG se escala distinto en cada ancho y un % se despegaba del avión. */
    var body = svg.querySelector('.plane__body').getBoundingClientRect();
    var box = stage.getBoundingClientRect();
    var pad = Math.max(6, body.height * 0.16);
    el.zone.style.top = (body.top - box.top - pad) + 'px';
    el.zone.style.height = (body.height + pad * 2) + 'px';

    el.zoneTag.textContent = t('short' + cap(SECTIONS[active].key)).toUpperCase();
  }

  function placePin(row) {
    el.pin.style.left = toPx(rowX(row)) + 'px';
    el.pinRow.textContent = row;
    el.pin.classList.add('on');
  }

  /* ---------- mapa ---------- */

  function buildMap() {
    var frag = document.createDocumentFragment();

    LETTERS.forEach(function (L) {
      var s = document.createElement('span');
      s.className = 'tag tag--letter';
      s.style.setProperty('--lp', LP[L]);
      s.textContent = L;
      frag.appendChild(s);
    });

    rowsOf(active).forEach(function (row, i) {
      var n = document.createElement('span');
      n.className = 'tag tag--row';
      n.style.setProperty('--rp', i + 1);
      n.textContent = row;
      frag.appendChild(n);

      LETTERS.forEach(function (L) {
        var id = row + L;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'seat';
        b.dataset.seat = id;
        b.style.setProperty('--lp', LP[L]);
        b.style.setProperty('--rp', i + 1);

        var num = document.createElement('span');
        num.className = 'seat__n';
        b.appendChild(num);

        if (isTaken(row, L)) {
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
    stampOrder();
  }

  /* El asiento elegido lleva el número de orden en que se eligió. */
  function stampOrder() {
    el.map.querySelectorAll('.seat').forEach(function (s) {
      var i = picked.indexOf(s.dataset.seat);
      s.querySelector('.seat__n').textContent = i === -1 ? '' : (i + 1);
    });
  }

  function freeCount() {
    var n = 0;
    rowsOf(active).forEach(function (row) {
      LETTERS.forEach(function (L) { if (!isTaken(row, L)) n++; });
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
    head();
    placeZone();
  }

  /* El título de la sección se dice corto en móvil y largo en web. */
  function head() {
    var s = SECTIONS[active];
    el.secShort.textContent = t('short' + cap(s.key)) + ' · ' + t('sec') + ' ' + s.n;
    el.secLong.textContent = t('section') + ' ' + s.n + ' (' + t(s.key) + ')';
    el.secStat.textContent = freeCount() + ' ' + t('free') + ' · ' + money(s.price) + ' ' + t('per');
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

    var from = shown, d = target - from;
    if (d === 0) return;

    /* Una pestaña en segundo plano no recibe frames: ahí se pone el final. */
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
    return picked.reduce(function (a, id) { return a + sectionOfRow(parseInt(id, 10)).price; }, 0);
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
    stampOrder();
    chips(el.chipsDesk, false);
    chips(el.chipsMob, true);

    el.nDesk.textContent = picked.length;
    el.nMob.textContent = picked.length;
    el.ctaDesk.disabled = picked.length === 0;
    el.ctaMob.disabled = picked.length === 0;

    if (!picked.length) el.pin.classList.remove('on');

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

  /* ---------- textos ---------- */

  function applyText() {
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (n) { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });

    buildMap();
    head();
    placeZone();
    render();
  }

  /* ---------- cableado ---------- */

  el.map.addEventListener('click', function (e) {
    var s = e.target.closest('.seat');
    if (s && !s.disabled) toggle(s.dataset.seat);
  });

  el.back.addEventListener('click', function () { history.back(); });

  [el.ctaDesk, el.ctaMob].forEach(function (b) {
    b.addEventListener('click', function () {
      if (picked.length) toast(fill(t('ok'), { s: picked.join(', '), t: money(sum()) }));
    });
  });

  /* El pin y el recuadro están en píxeles: siguen al resize. */
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
  applyText();
  requestAnimationFrame(placeZone);
  setTimeout(placeZone, 150);   /* por si las fuentes aún no cargaron */
})();
