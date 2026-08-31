/* AeroPasto — seat picker. Vanilla, no build step. */
(function () {
  'use strict';

  var MAX_SEATS = 4;

  var CABIN = [
    { id: 'premium', label: 'premium', rows: [1, 2, 3], letters: ['A', 'B', 'C', 'D'], aisleAfter: 1, price: 320000 },
    { id: 'economy', label: 'economy', rows: range(4, 22), letters: ['A', 'B', 'C', 'D', 'E', 'F'], aisleAfter: 2, price: 180000 }
  ];

  /* Fixed so the cabin looks the same on every reload and on the projector. */
  var TAKEN = ['1A', '1B', '2C', '3D', '4A', '4B', '5F', '6C', '6D', '7A', '8E', '8F',
               '9B', '10C', '10D', '11A', '12E', '13B', '13C', '14F', '16A', '16B',
               '17D', '18E', '19C', '20A', '20F', '21B', '22D'];

  var I18N = {
    es: {
      title: 'Elige tu asiento',
      subtitle: 'Puedes seleccionar hasta 4 puestos.',
      legFree: 'Libre', legPremium: 'Premium', legSel: 'Elegido', legBusy: 'Ocupado',
      premium: 'Cabina Premium', economy: 'Cabina Económica',
      summary: 'Resumen', total: 'Total', confirm: 'Confirmar',
      none: 'Sin asientos', note: 'El precio incluye impuestos y tasa aeroportuaria.',
      navFlights: 'Mis vuelos', navHelp: 'Ayuda',
      cityPso: 'Pasto', cityBog: 'Bogotá',
      metaFlight: 'Vuelo', metaDate: 'Fecha', metaDateVal: '12 sep 2026', metaBoard: 'Abordaje',
      back: 'Volver',
      seatOf: 'Asiento {s} — {c}',
      swapped: 'Solo puedes llevar 4 puestos: {a} se reemplazó por {b}.',
      done: 'Listo: {n} puesto(s) por {t}.',
      emptyPanel: 'Todavía no has elegido nada.'
    },
    en: {
      title: 'Pick your seat',
      subtitle: 'You can select up to 4 seats.',
      legFree: 'Available', legPremium: 'Premium', legSel: 'Selected', legBusy: 'Taken',
      premium: 'Premium cabin', economy: 'Economy cabin',
      summary: 'Summary', total: 'Total', confirm: 'Confirm',
      none: 'No seats yet', note: 'Price includes taxes and airport fees.',
      navFlights: 'My flights', navHelp: 'Help',
      cityPso: 'Pasto', cityBog: 'Bogota',
      metaFlight: 'Flight', metaDate: 'Date', metaDateVal: 'Sep 12, 2026', metaBoard: 'Boarding',
      back: 'Back',
      seatOf: 'Seat {s} — {c}',
      swapped: 'Only 4 seats allowed: {a} was replaced by {b}.',
      done: 'Done: {n} seat(s) for {t}.',
      emptyPanel: 'Nothing selected yet.'
    }
  };

  var lang = 'es';
  var picked = [];               /* FIFO: oldest first */
  var shownTotal = 0;            /* what the counter currently reads */
  var counterFrame = null;

  var el = {
    cabin: document.getElementById('cabin'),
    marker: document.getElementById('marker'),
    markerRow: document.getElementById('markerRow'),
    panelSeats: document.getElementById('panelSeats'),
    panelLines: document.getElementById('panelLines'),
    panelTotal: document.getElementById('panelTotal'),
    barCount: document.getElementById('barCount'),
    barSeats: document.getElementById('barSeats'),
    barTotal: document.getElementById('barTotal'),
    toast: document.getElementById('toast'),
    lang: document.getElementById('lang'),
    back: document.getElementById('back'),
    ctas: [document.getElementById('ctaDesktop'), document.getElementById('ctaMobile')]
  };

  /* ---------- helpers ---------- */

  function range(a, b) {
    var out = [];
    for (var i = a; i <= b; i++) out.push(i);
    return out;
  }

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || key;
  }

  function fill(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
  }

  function money(n) {
    return '$ ' + Math.round(n).toLocaleString('es-CO');
  }

  function sectionOf(id) {
    var row = parseInt(id, 10);
    for (var i = 0; i < CABIN.length; i++) {
      if (CABIN[i].rows.indexOf(row) !== -1) return CABIN[i];
    }
    return CABIN[CABIN.length - 1];
  }

  function seatEl(id) {
    return el.cabin.querySelector('[data-seat="' + id + '"]');
  }

  /* ---------- build the cabin ---------- */

  function buildCabin() {
    var frag = document.createDocumentFragment();

    CABIN.forEach(function (section, index) {
      if (index > 0) {
        var curtain = document.createElement('div');
        curtain.className = 'curtain';
        curtain.setAttribute('aria-hidden', 'true');
        frag.appendChild(curtain);
      }

      var label = document.createElement('h2');
      label.className = 'section__label';
      label.dataset.i18n = section.label;
      label.textContent = t(section.label);
      frag.appendChild(label);

      section.rows.forEach(function (n) {
        var row = document.createElement('div');
        row.className = 'row';
        row.dataset.row = n;

        var num = document.createElement('span');
        num.className = 'row__n';
        num.textContent = n;
        row.appendChild(num);

        section.letters.forEach(function (letter, i) {
          var id = n + letter;
          var seat = document.createElement('button');
          seat.type = 'button';
          seat.className = 'seat' + (section.id === 'premium' ? ' seat--premium' : '');
          seat.dataset.seat = id;
          seat.dataset.row = n;
          seat.textContent = id;
          seat.setAttribute('aria-pressed', 'false');
          seat.setAttribute('aria-label', fill(t('seatOf'), { s: id, c: t(section.label) }));

          if (TAKEN.indexOf(id) !== -1) {
            seat.disabled = true;
            seat.setAttribute('aria-label', fill(t('seatOf'), { s: id, c: t(section.label) }) + ' — ' + t('legBusy'));
          }

          row.appendChild(seat);

          if (i === section.aisleAfter) {
            var aisle = document.createElement('span');
            aisle.className = 'row__aisle';
            aisle.setAttribute('aria-hidden', 'true');
            row.appendChild(aisle);
          }
        });

        frag.appendChild(row);
      });
    });

    el.cabin.innerHTML = '';
    el.cabin.appendChild(frag);
  }

  /* ---------- selection: max 4, the 5th evicts the oldest ---------- */

  function toggle(id) {
    var at = picked.indexOf(id);

    if (at !== -1) {
      picked.splice(at, 1);
      paint(id, false);
      render();
      return;
    }

    var evicted = null;
    if (picked.length >= MAX_SEATS) {
      evicted = picked.shift();
      paint(evicted, false);
      bump(evicted, 'is-drop');
    }

    picked.push(id);
    paint(id, true);
    bump(id, 'is-pop');
    moveMarker(id);
    render();

    if (evicted) {
      toast(fill(t('swapped'), { a: evicted, b: id }));
    }
  }

  function paint(id, on) {
    var seat = seatEl(id);
    if (seat) seat.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function bump(id, cls) {
    var seat = seatEl(id);
    if (!seat) return;
    seat.classList.remove('is-pop', 'is-drop');
    void seat.offsetWidth;              /* restart the animation */
    seat.classList.add(cls);
  }

  /* ---------- the plane animation: the marker travels to the row ---------- */

  function moveMarker(id) {
    var seat = seatEl(id);
    if (!seat) return;

    var row = seat.closest('.row');
    var rail = el.marker.parentNode;
    var top = row.offsetTop + (row.offsetHeight / 2) - rail.offsetTop;

    /* Setting `top` (not translate) lets the CSS transition run the trip,
       so going from row 2 to row 3 slides instead of jumping. */
    el.marker.style.top = top + 'px';
    el.markerRow.textContent = seat.dataset.row;
    el.marker.classList.add('is-on');
  }

  function resetMarker() {
    el.marker.classList.remove('is-on');
    el.markerRow.textContent = '—';
  }

  /* ---------- the total counter counts, it does not jump ---------- */

  function countTo(target) {
    if (counterFrame) cancelAnimationFrame(counterFrame);

    var from = shownTotal;
    var delta = target - from;
    if (delta === 0) return;

    /* Background tabs get no animation frames at all, so counting there
       would leave the amount frozen at a stale value. Land it directly. */
    if (document.hidden) {
      shownTotal = target;
      el.panelTotal.textContent = money(target);
      el.barTotal.textContent = money(target);
      return;
    }

    var start = performance.now();
    var ms = 480;

    function step(now) {
      var p = Math.min(1, (now - start) / ms);
      var eased = 1 - Math.pow(1 - p, 3);
      shownTotal = from + delta * eased;

      var text = money(shownTotal);
      el.panelTotal.textContent = text;
      el.barTotal.textContent = text;

      if (p < 1) {
        counterFrame = requestAnimationFrame(step);
      } else {
        shownTotal = target;
        counterFrame = null;
      }
    }

    counterFrame = requestAnimationFrame(step);
  }

  /* ---------- render both summaries ---------- */

  function totals() {
    var byClass = {};
    var sum = 0;

    picked.forEach(function (id) {
      var s = sectionOf(id);
      byClass[s.label] = byClass[s.label] || { count: 0, amount: 0 };
      byClass[s.label].count++;
      byClass[s.label].amount += s.price;
      sum += s.price;
    });

    return { byClass: byClass, sum: sum };
  }

  function render() {
    var sums = totals();

    /* mobile bar */
    el.barCount.textContent = picked.length + '/' + MAX_SEATS;
    el.barSeats.textContent = picked.length ? picked.join(' · ') : t('none');

    /* desktop panel */
    el.panelSeats.innerHTML = '';
    if (!picked.length) {
      var empty = document.createElement('p');
      empty.className = 'panel__empty';
      empty.textContent = t('emptyPanel');
      el.panelSeats.appendChild(empty);
    } else {
      picked.forEach(function (id) {
        var chip = document.createElement('span');
        chip.className = 'panel__seat';
        chip.textContent = id;

        var x = document.createElement('button');
        x.type = 'button';
        x.textContent = '×';
        x.setAttribute('aria-label', id);
        x.addEventListener('click', function () { toggle(id); });
        chip.appendChild(x);

        el.panelSeats.appendChild(chip);
      });
    }

    el.panelLines.innerHTML = '';
    Object.keys(sums.byClass).forEach(function (key) {
      var line = sums.byClass[key];
      var wrap = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = t(key) + ' × ' + line.count;
      var dd = document.createElement('dd');
      dd.textContent = money(line.amount);
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      el.panelLines.appendChild(wrap);
    });

    el.ctas.forEach(function (b) { if (b) b.disabled = picked.length === 0; });

    if (!picked.length) resetMarker();

    countTo(sums.sum);
  }

  /* ---------- toast ---------- */

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('is-on'); }, 2600);
  }

  /* ---------- language ---------- */

  function applyLang() {
    document.documentElement.lang = lang;
    el.lang.textContent = lang === 'es' ? 'EN' : 'ES';

    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (node) {
      node.setAttribute('aria-label', t(node.dataset.i18nAria));
    });

    /* Seat labels carry the cabin name, so they need re-writing too. */
    el.cabin.querySelectorAll('.seat').forEach(function (seat) {
      var id = seat.dataset.seat;
      var label = fill(t('seatOf'), { s: id, c: t(sectionOf(id).label) });
      seat.setAttribute('aria-label', seat.disabled ? label + ' — ' + t('legBusy') : label);
    });

    render();
  }

  /* ---------- wiring ---------- */

  el.cabin.addEventListener('click', function (e) {
    var seat = e.target.closest('.seat');
    if (seat && !seat.disabled) toggle(seat.dataset.seat);
  });

  el.lang.addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es';
    applyLang();
  });

  el.back.addEventListener('click', function () { history.back(); });

  el.ctas.forEach(function (b) {
    if (!b) return;
    b.addEventListener('click', function () {
      if (!picked.length) return;
      toast(fill(t('done'), { n: picked.length, t: money(totals().sum) }));
    });
  });

  /* The marker is positioned in pixels, so it has to follow a resize. */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!picked.length) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { moveMarker(picked[picked.length - 1]); }, 120);
  });

  buildCabin();
  applyLang();
})();
