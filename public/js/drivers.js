/* United Services Recruiting — available drivers board (For Companies)
 *
 * Reads the public published_drivers view from Supabase and renders each
 * driver as an anonymized card. Filters: equipment, experience, SAP
 * clearance. Carriers route through admin to request an intro — no PII
 * is ever surfaced here (name/phone/email live in the base table only,
 * not in the view).
 */
(function () {
  'use strict';
  var grid = document.getElementById('drivers-grid');
  if (!grid) return;

  // Display options (label, value used for filter state)
  var EQ = [
    ['all', 'All equipment'],
    ['dryvan', 'Dry Van'],
    ['flatbed', 'Flatbed'],
    ['reefer', 'Reefer'],
    ['stepdeck', 'Step Deck'],
    ['tanker', 'Tanker'],
    ['poweronly', 'Power Only'],
    ['carhauler', 'Car Hauler']
  ];
  var EXP = [
    ['all', 'Any'],
    ['no', 'No experience'],
    ['mid', '1–4 yrs'],
    ['sr', '5+ yrs']
  ];
  var CLR = [['all', 'Any'], ['sap', 'SAP-cleared'], ['clean', 'Clean record']];

  var state = { eq: 'all', exp: 'all', clear: 'all' };
  var drivers = [];

  // Equipment label → filter slug (so we can match the source data which
  // is stored as a text[] of pretty labels like ['Dry Van','Reefer'])
  var EQ_SLUG = {
    'Dry Van': 'dryvan', 'Flatbed': 'flatbed', 'Reefer': 'reefer',
    'Step Deck': 'stepdeck', 'Tanker': 'tanker', 'Power Only': 'poweronly',
    'Car Hauler': 'carhauler'
  };

  // Years string from the Apply form → bucket used by filters
  function expBucket(years) {
    if (!years) return 'mid';
    var y = String(years).toLowerCase();
    if (y.indexOf('no experience') !== -1) return 'no';
    if (y.indexOf('less than 1') !== -1) return 'mid';
    if (y.indexOf('5+') !== -1) return 'sr';
    if (y.indexOf('3–5') !== -1 || y.indexOf('3-5') !== -1) return 'sr';
    return 'mid';
  }
  function clearBucket(sap) {
    if (!sap) return 'clean';
    return String(sap).toLowerCase().indexOf('yes') === 0 ? 'sap' : 'clean';
  }
  function shortYrs(years) {
    if (!years) return '—';
    var y = String(years);
    if (y.indexOf('No experience') !== -1) return 'New';
    if (y.indexOf('Less than 1') !== -1) return '<1 yr';
    if (y.indexOf('1–2') !== -1) return '1–2 yrs';
    if (y.indexOf('2–3') !== -1) return '2–3 yrs';
    if (y.indexOf('3–5') !== -1) return '3–5 yrs';
    if (y.indexOf('5+') !== -1) return '5+ yrs';
    return y;
  }
  function firstEquipment(arr) {
    if (Array.isArray(arr) && arr.length) return arr[0];
    return null;
  }
  function firstEquipmentSlug(arr) {
    var f = firstEquipment(arr);
    return f ? (EQ_SLUG[f] || 'dryvan') : 'dryvan';
  }
  function shortLocation(loc) {
    if (!loc) return '—';
    return String(loc).split(/[,—-]/)[0].trim() || '—';
  }
  function shortId(uuid) {
    if (!uuid) return '0000';
    var hex = String(uuid).replace(/-/g, '');
    return '1' + parseInt(hex.slice(0, 4), 16).toString(10).slice(-3);
  }

  function buildRow(label, opts, key) {
    var row = document.createElement('div'); row.className = 'filter-row';
    var l = document.createElement('span'); l.className = 'fl-label'; l.textContent = label; row.appendChild(l);
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'fchip' + (state[key] === o[0] ? ' on' : '');
      b.type = 'button';
      b.textContent = o[1];
      b.setAttribute('data-v', o[0]);
      b.addEventListener('click', function () {
        state[key] = o[0];
        row.querySelectorAll('.fchip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-v') === o[0]); });
        render();
      });
      row.appendChild(b);
    });
    return row;
  }

  var filtersEl = document.getElementById('filters');
  if (filtersEl) {
    filtersEl.appendChild(buildRow('Equipment', EQ, 'eq'));
    filtersEl.appendChild(buildRow('Experience', EXP, 'exp'));
    filtersEl.appendChild(buildRow('Clearance', CLR, 'clear'));
  }

  var driverIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var arrowIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function match(d) {
    return (state.eq === 'all' || d._eq === state.eq) &&
           (state.exp === 'all' || d._exp === state.exp) &&
           (state.clear === 'all' || d._clear === state.clear);
  }

  function render() {
    var list = drivers.filter(match);
    var countEl = document.getElementById('board-count');
    if (countEl && window.USR && window.USR.animateCount) window.USR.animateCount(countEl, list.length, 500);
    else if (countEl) countEl.textContent = list.length;

    if (!list.length) {
      grid.innerHTML = '<div class="board-empty"><div class="t">No drivers match those filters</div><div>Try widening your equipment or experience range — new drivers join the board daily.</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (d) {
      var eqLabel = firstEquipment(d.equipment) || 'Open';
      var clearTag = d._clear === 'sap'
        ? '<span class="clear">SAP-cleared</span>'
        : '<span class="clear">Clean record</span>';
      var availPill = '<span class="pill live"><span class="dot"></span>Available</span>';
      return '<div class="card driver-card edge-top">' +
        '<div class="dc-top"><div class="dc-avatar">' + driverIco + '</div>' +
          '<div><div class="dc-id">Driver #' + escapeHtml(shortId(d.id)) + '</div>' +
          '<div class="dc-loc">' + escapeHtml(shortLocation(d.location)) + '</div></div></div>' +
        '<div class="dc-meta">' +
          '<div class="dc-line"><span class="lab">License</span><span class="val">' + escapeHtml(d.cdl_class || '—') + '</span></div>' +
          '<div class="dc-line"><span class="lab">Experience</span><span class="val">' + escapeHtml(shortYrs(d.years)) + '</span></div>' +
          '<div class="dc-line"><span class="lab">Route</span><span class="val">' + escapeHtml(d.route || '—') + '</span></div>' +
        '</div>' +
        '<div class="dc-tags"><span>' + escapeHtml(eqLabel) + '</span>' + clearTag + '</div>' +
        '<div class="dc-foot">' + availPill + '<a href="#contact">Request' + arrowIco + '</a></div>' +
      '</div>';
    }).join('');
  }

  function loading() {
    grid.innerHTML = '<div class="board-empty"><div class="t">Loading drivers…</div><div>Pulling the live board.</div></div>';
  }
  function failed() {
    grid.innerHTML = '<div class="board-empty"><div class="t">Couldn\'t load the driver board</div><div>Refresh the page in a moment — the board is updated continuously.</div></div>';
  }

  loading();

  function ready() { return window.usrSupabase; }
  function go() {
    var sb = window.usrSupabase;
    sb.from('published_drivers')
      .select('id, created_at, cdl_class, years, equipment, route, sap_status, location, notes')
      .order('created_at', { ascending: false })
      .limit(120)
      .then(function (res) {
        if (res.error) { console.warn('published_drivers select failed:', res.error.message); failed(); return; }
        drivers = (res.data || []).map(function (d) {
          d._eq    = firstEquipmentSlug(d.equipment);
          d._exp   = expBucket(d.years);
          d._clear = clearBucket(d.sap_status);
          return d;
        });
        render();
      });
  }
  if (ready()) go();
  else {
    var tries = 0;
    var iv = setInterval(function () {
      if (ready()) { clearInterval(iv); go(); }
      else if (++tries > 40) { clearInterval(iv); failed(); }
    }, 50);
  }
})();
