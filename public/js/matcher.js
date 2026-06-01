/* United Services Recruiting — "Do we have a job for you?" matcher */
(function () {
  'use strict';
  var chipsEl = document.getElementById('matcher-chips');
  var resultEl = document.getElementById('matcher-result');
  if (!chipsEl || !resultEl) return;
  var reduce = (window.USR && window.USR.reduce);

  // each situation: key, label, tags it matches against the offer pool, openings weight
  var CHIPS = [
    { key: 'sap',  label: "I'm an SAP driver",   tags: ['sap'],      n: 38,  msg: 'We have a job for you.' },
    { key: 'noexp',label: 'I have no experience', tags: ['noexp'],    n: 52,  msg: 'We have a job for you.' },
    { key: 'cdla', label: "I'm CDL-A",            tags: ['cdla'],     n: 214, msg: 'We have a job for you.' },
    { key: 'flat', label: 'I want flatbed loads', tags: ['flatbed'],  n: 47,  msg: "We've got the offer." },
    { key: 'reefer',label: 'I run reefer',        tags: ['reefer'],   n: 41,  msg: 'We have a job for you.' },
    { key: 'dry',  label: 'I run dry van',        tags: ['dryvan'],   n: 63,  msg: 'We have a job for you.' },
    { key: 'oo',   label: "I'm an owner-operator",tags: ['owner'],    n: 29,  msg: "We've got the offer." },
    { key: 'otr',  label: 'I need OTR',           tags: ['otr'],      n: 88,  msg: 'We have a job for you.' },
    { key: 'reg',  label: 'I want Regional',      tags: ['regional'], n: 57,  msg: 'We have a job for you.' },
    { key: 'local',label: 'I want Local / home daily', tags: ['local'], n: 34, msg: 'We have a job for you.' }
  ];

  // sample live offers pool
  var OFFERS = [
    { co: 'Cardinal Freightways', eq: 'Dry Van',  route: 'OTR',      pay: '$0.62/mi', tag: ['dryvan','otr','cdla'], note: 'No-touch · 2,800 mi/wk' },
    { co: 'Ironwood Carriers',    eq: 'Flatbed',  route: 'Regional', pay: '$1,500/wk', tag: ['flatbed','regional','cdla'], note: 'Home weekends' },
    { co: 'Polar Line Logistics', eq: 'Reefer',   route: 'OTR',      pay: '$0.64/mi', tag: ['reefer','otr','cdla'], note: 'Sign-on $5k' },
    { co: 'Meridian Transport',   eq: 'Dry Van',  route: 'Regional', pay: '$1,450/wk', tag: ['dryvan','regional','sap','cdla'], note: 'SAP friendly' },
    { co: 'Summit Hauling Co.',   eq: 'Dry Van',  route: 'OTR',      pay: 'Paid CDL', tag: ['noexp','dryvan','otr'], note: 'No experience · training' },
    { co: 'Granite State Lines',  eq: 'Flatbed',  route: 'OTR',      pay: '$0.66/mi', tag: ['flatbed','otr','cdla'], note: 'Tarp pay +$50' },
    { co: 'Harbor Point Freight', eq: 'Reefer',   route: 'Regional', pay: '$1,520/wk', tag: ['reefer','regional','sap'], note: 'SAP cleared OK' },
    { co: 'Crossroads Express',   eq: 'Dry Van',  route: 'Local',    pay: '$26/hr', tag: ['dryvan','local','cdla'], note: 'Home daily' },
    { co: 'Big Sky Bulk',         eq: 'Power Only',route: 'OTR',     pay: '78% gross', tag: ['owner','otr'], note: 'Owner-operator' },
    { co: 'Liberty Roadways',     eq: 'Reefer',   route: 'Local',    pay: '$27/hr', tag: ['reefer','local','cdla'], note: 'Home daily · NE' }
  ];

  var selected = new Set();

  // build chips
  CHIPS.forEach(function (c) {
    var b = document.createElement('button');
    b.className = 'matcher-chip';
    b.type = 'button';
    b.setAttribute('data-key', c.key);
    b.innerHTML = '<span class="mc-shine"></span><span class="mc-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="mc-label">' + c.label + '</span>';
    b.addEventListener('click', function () {
      if (selected.has(c.key)) { selected.delete(c.key); b.classList.remove('on'); }
      else {
        selected.add(c.key); b.classList.add('on');
        if (!reduce) { b.classList.remove('shine'); void b.offsetWidth; b.classList.add('shine'); }
      }
      render();
    });
    chipsEl.appendChild(b);
  });

  function matchOffers() {
    if (selected.size === 0) return [];
    var keys = Array.from(selected);
    var tagset = new Set();
    CHIPS.forEach(function (c) { if (selected.has(c.key)) c.tags.forEach(function (t) { tagset.add(t); }); });
    // offer matches if it shares at least one selected tag
    return OFFERS.filter(function (o) { return o.tag.some(function (t) { return tagset.has(t); }); });
  }

  function totalOpenings() {
    var sum = 0;
    CHIPS.forEach(function (c) { if (selected.has(c.key)) sum += c.n; });
    // de-emphasize pure addition: blend
    return sum;
  }

  var lastCount = 0;
  function render() {
    if (selected.size === 0) {
      resultEl.classList.remove('yes');
      resultEl.innerHTML = '<div class="mr-empty"><div class="mr-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18M3 12h18M3 17h12"/></svg></div><p class="mr-empty-t">Select what describes you.</p><p class="mr-empty-s">Pick one or more — we\'ll show how many live openings match right now.</p></div>';
      lastCount = 0;
      return;
    }
    var offers = matchOffers();
    var count = totalOpenings();
    var firstChip = CHIPS.find(function (c) { return selected.has(c.key); });
    var headline = selected.size === 1 ? firstChip.msg : 'Yes — we have offers for you.';

    resultEl.classList.add('yes');
    resultEl.innerHTML =
      '<div class="mr-top">' +
        '<span class="pill live"><span class="dot"></span>Live openings</span>' +
        '<div class="mr-count"><span class="mr-num" id="mr-num">0</span><span class="mr-unit">matches</span></div>' +
        '<h3 class="mr-head chrome-text">' + headline + '</h3>' +
      '</div>' +
      '<div class="mr-offers">' +
        offers.slice(0, 4).map(function (o) {
          return '<div class="mr-offer"><div class="mr-offer-h"><b>' + o.co + '</b><span class="mr-pay">' + o.pay + '</span></div>' +
            '<div class="mr-offer-tags"><span>' + o.eq + '</span><span>' + o.route + '</span></div>' +
            '<div class="mr-offer-note">' + o.note + '</div></div>';
        }).join('') +
      '</div>' +
      '<a class="btn btn-steel btn-lg mr-cta" href="apply.html" data-magnetic="0.3">Apply now<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';

    var numEl = document.getElementById('mr-num');
    if (window.USR) window.USR.animateCount(numEl, count, 900, function (v) { return v.toLocaleString(); });
    else numEl.textContent = count;
    lastCount = count;

    // re-bind magnetic on the new CTA
    if (window.USR && window.USR.fine && !reduce) {
      var cta = resultEl.querySelector('[data-magnetic]');
      if (cta) {
        cta.addEventListener('mousemove', function (e) { var r = cta.getBoundingClientRect(); cta.style.transform = 'translate(' + (e.clientX - (r.left + r.width / 2)) * 0.3 + 'px,' + (e.clientY - (r.top + r.height / 2)) * 0.3 + 'px)'; });
        cta.addEventListener('mouseleave', function () { cta.style.transform = ''; });
      }
    }
  }

  render();
})();
