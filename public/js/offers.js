/* United Services — Available offers board (for drivers)
 *
 * Reads the public published_offers view from Supabase and renders each
 * row as a card. Filters: equipment, hire count. No contact info ever
 * surfaces here — drivers route through the admin via apply.html.
 */
(function () {
  'use strict';
  var grid = document.getElementById('offers-grid');
  if (!grid) return;

  var EQ = [
    ['all', 'All equipment'],
    ['Dry Van', 'Dry Van'],
    ['Flatbed', 'Flatbed'],
    ['Reefer', 'Reefer'],
    ['Step Deck', 'Step Deck'],
    ['Tanker', 'Tanker'],
    ['Power Only', 'Power Only'],
    ['Car Hauler', 'Car Hauler'],
    ['Mixed fleet', 'Mixed fleet']
  ];
  var COUNT = [
    ['all', 'Any'],
    ['1–5', '1–5'],
    ['6–15', '6–15'],
    ['16–50', '16–50'],
    ['50+', '50+']
  ];

  var state = { eq: 'all', count: 'all' };
  var offers = [];

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
    filtersEl.appendChild(buildRow('Hiring', COUNT, 'count'));
  }

  var truckIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><polyline points="14 8 18 8 22 12 22 17 14 17"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>';
  var arrowIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function match(o) {
    return (state.eq === 'all' || o.equipment === state.eq) &&
           (state.count === 'all' || o.hire_count === state.count);
  }

  function postedAgo(iso) {
    if (!iso) return '';
    var t = (Date.parse(iso) || 0);
    if (!t) return '';
    var days = Math.floor((Date.now() - t) / 86400000);
    if (days < 1) return 'Posted today';
    if (days === 1) return 'Posted yesterday';
    if (days < 7) return 'Posted ' + days + ' days ago';
    if (days < 30) return 'Posted ' + Math.floor(days / 7) + ' wk ago';
    return 'Posted ' + Math.floor(days / 30) + ' mo ago';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render() {
    var list = offers.filter(match);
    var countEl = document.getElementById('board-count');
    if (countEl && window.USR && window.USR.animateCount) window.USR.animateCount(countEl, list.length, 500);
    else if (countEl) countEl.textContent = list.length;

    if (!list.length) {
      grid.innerHTML = '<div class="board-empty"><div class="t">No offers match those filters</div><div>Try widening the equipment range — new offers post throughout the week.</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (o) {
      var eq = o.equipment || '—';
      var hc = o.hire_count ? 'Hiring ' + o.hire_count : '';
      var notes = o.notes ? escapeHtml(o.notes) : 'Reach out for lane details and pay.';
      return '<div class="card driver-card edge-top">' +
        '<div class="dc-top"><div class="dc-avatar">' + truckIco + '</div>' +
          '<div><div class="dc-id">' + escapeHtml(o.company || 'Verified carrier') + '</div>' +
          '<div class="dc-loc">' + postedAgo(o.created_at) + '</div></div></div>' +
        '<div class="dc-meta">' +
          '<div class="dc-line"><span class="lab">Equipment</span><span class="val">' + escapeHtml(eq) + '</span></div>' +
          (hc ? '<div class="dc-line"><span class="lab">Fleet need</span><span class="val">' + escapeHtml(o.hire_count) + '</span></div>' : '') +
        '</div>' +
        '<div class="dc-tags"><span>' + escapeHtml(eq) + '</span></div>' +
        '<div class="dc-notes" style="font-size:13px;line-height:1.55;color:var(--silver-txt);margin-bottom:16px;">' + notes + '</div>' +
        '<div class="dc-foot"><span class="pill"><span class="dot"></span>Verified</span>' +
          '<a href="apply.html">Apply via US' + arrowIco + '</a></div>' +
      '</div>';
    }).join('');
  }

  function loading() {
    grid.innerHTML = '<div class="board-empty"><div class="t">Loading offers…</div><div>Pulling the live board.</div></div>';
  }
  function failed() {
    grid.innerHTML = '<div class="board-empty"><div class="t">Couldn\'t load offers</div><div>Refresh the page in a moment — the board is updated continuously.</div></div>';
  }

  loading();

  // Wait for the Supabase client to be ready (config.js bootstraps it
  // synchronously, but the supabase-js CDN script may still be parsing
  // when this file runs in some browsers).
  function ready() { return window.usrSupabase; }
  function go() {
    var sb = window.usrSupabase;
    sb.from('published_offers')
      .select('id, created_at, company, equipment, hire_count, notes')
      .order('created_at', { ascending: false })
      .limit(120)
      .then(function (res) {
        if (res.error) { console.warn('published_offers select failed:', res.error.message); failed(); return; }
        offers = res.data || [];
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
