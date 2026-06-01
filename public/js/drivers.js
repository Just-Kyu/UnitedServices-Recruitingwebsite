/* United Services Recruiting — available drivers board (For Companies) */
(function () {
  'use strict';
  var grid = document.getElementById('drivers-grid');
  if (!grid) return;

  var DRIVERS = [
    { id: 1042, cls: 'CDL-A', yrs: '3 yrs', exp: 'mid', route: 'OTR',      eq: 'flatbed', eqLabel: 'Flatbed',   clear: 'sap',  loc: 'Dallas, TX',     avail: 'now' },
    { id: 1058, cls: 'CDL-A', yrs: '7 yrs', exp: 'sr',  route: 'Regional', eq: 'reefer',  eqLabel: 'Reefer',    clear: 'clean',loc: 'Columbus, OH',   avail: 'now' },
    { id: 1063, cls: 'CDL-A', yrs: 'New',   exp: 'no',  route: 'OTR',      eq: 'dryvan',  eqLabel: 'Dry Van',   clear: 'clean',loc: 'Phoenix, AZ',    avail: '2 wks' },
    { id: 1071, cls: 'CDL-A', yrs: '2 yrs', exp: 'mid', route: 'Local',    eq: 'dryvan',  eqLabel: 'Dry Van',   clear: 'sap',  loc: 'Newark, NJ',     avail: 'now' },
    { id: 1085, cls: 'CDL-A', yrs: '11 yrs',exp: 'sr',  route: 'OTR',      eq: 'tanker',  eqLabel: 'Tanker',    clear: 'clean',loc: 'Houston, TX',    avail: 'now' },
    { id: 1090, cls: 'CDL-A', yrs: '5 yrs', exp: 'sr',  route: 'Regional', eq: 'flatbed', eqLabel: 'Flatbed',   clear: 'clean',loc: 'Atlanta, GA',    avail: '1 wk' },
    { id: 1104, cls: 'CDL-A', yrs: '1 yr',  exp: 'mid', route: 'OTR',      eq: 'reefer',  eqLabel: 'Reefer',    clear: 'sap',  loc: 'Chicago, IL',    avail: 'now' },
    { id: 1118, cls: 'CDL-A', yrs: 'New',   exp: 'no',  route: 'Regional', eq: 'dryvan',  eqLabel: 'Dry Van',   clear: 'clean',loc: 'Charlotte, NC',  avail: '2 wks' },
    { id: 1126, cls: 'CDL-A', yrs: '8 yrs', exp: 'sr',  route: 'OTR',      eq: 'stepdeck',eqLabel: 'Step Deck', clear: 'clean',loc: 'Denver, CO',     avail: 'now' },
    { id: 1133, cls: 'CDL-A', yrs: '4 yrs', exp: 'mid', route: 'Dedicated',eq: 'carhauler',eqLabel:'Car Hauler',clear: 'clean',loc: 'Detroit, MI',    avail: 'now' },
    { id: 1147, cls: 'CDL-A', yrs: '6 yrs', exp: 'sr',  route: 'OTR',      eq: 'poweronly',eqLabel:'Power Only',clear: 'sap',  loc: 'Memphis, TN',    avail: '1 wk' },
    { id: 1152, cls: 'CDL-A', yrs: '2 yrs', exp: 'mid', route: 'Local',    eq: 'reefer',  eqLabel: 'Reefer',    clear: 'clean',loc: 'Sacramento, CA', avail: 'now' }
  ];

  var EQ = [['all','All equipment'],['dryvan','Dry Van'],['flatbed','Flatbed'],['reefer','Reefer'],['stepdeck','Step Deck'],['tanker','Tanker'],['poweronly','Power Only'],['carhauler','Car Hauler']];
  var EXP = [['all','Any'],['no','No experience'],['mid','1–4 yrs'],['sr','5+ yrs']];
  var CLR = [['all','Any'],['sap','SAP-cleared'],['clean','Clean record']];

  var state = { eq: 'all', exp: 'all', clear: 'all' };

  function buildRow(label, opts, key) {
    var row = document.createElement('div'); row.className = 'filter-row';
    var l = document.createElement('span'); l.className = 'fl-label'; l.textContent = label; row.appendChild(l);
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.className = 'fchip' + (state[key] === o[0] ? ' on' : ''); b.type = 'button';
      b.textContent = o[1]; b.setAttribute('data-v', o[0]);
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
  filtersEl.appendChild(buildRow('Equipment', EQ, 'eq'));
  filtersEl.appendChild(buildRow('Experience', EXP, 'exp'));
  filtersEl.appendChild(buildRow('Clearance', CLR, 'clear'));

  var driverIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var arrowIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function match(d) {
    return (state.eq === 'all' || d.eq === state.eq) &&
           (state.exp === 'all' || d.exp === state.exp) &&
           (state.clear === 'all' || d.clear === state.clear);
  }

  function render() {
    var list = DRIVERS.filter(match);
    var countEl = document.getElementById('board-count');
    if (countEl && window.USR) window.USR.animateCount(countEl, list.length, 500);
    else if (countEl) countEl.textContent = list.length;

    if (!list.length) {
      grid.innerHTML = '<div class="board-empty"><div class="t">No drivers match those filters</div><div>Try widening your equipment or experience range — new drivers join the board daily.</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (d) {
      var clearTag = d.clear === 'sap' ? '<span class="clear">SAP-cleared</span>' : '<span class="clear">Clean record</span>';
      var availPill = d.avail === 'now'
        ? '<span class="pill live"><span class="dot"></span>Available now</span>'
        : '<span class="pill"><span class="dot"></span>In ' + d.avail + '</span>';
      return '<div class="card driver-card edge-top">' +
        '<div class="dc-top"><div class="dc-avatar">' + driverIco + '</div><div><div class="dc-id">Driver #' + d.id + '</div><div class="dc-loc">' + d.loc + '</div></div></div>' +
        '<div class="dc-meta">' +
          '<div class="dc-line"><span class="lab">License</span><span class="val">' + d.cls + '</span></div>' +
          '<div class="dc-line"><span class="lab">Experience</span><span class="val">' + d.yrs + '</span></div>' +
          '<div class="dc-line"><span class="lab">Route</span><span class="val">' + d.route + '</span></div>' +
        '</div>' +
        '<div class="dc-tags"><span>' + d.eqLabel + '</span>' + clearTag + '</div>' +
        '<div class="dc-foot">' + availPill + '<a href="#contact">Request' + arrowIco + '</a></div>' +
      '</div>';
    }).join('');
  }

  render();
})();
