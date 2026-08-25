/* United Services — expandable carrier offer card
 *
 * One renderer shared by the homepage grid and the /offers board, so a card
 * looks and behaves the same in both places.
 *
 * Collapsed: carrier logo, name, location, pay, a few tags.
 * Expanded (click): the card takes the full row width and reveals the detail
 * frames (home time, escrow, sign-on, insurance, equipment…), the admin's
 * notes, and a pay calculator seeded from the offer's own numbers.
 *
 * Exposes window.USROffers = { card, bind }.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Pull a $/mile figure out of whatever the admin typed in "pay", so the
  // calculator still works when the dedicated rpm column is empty.
  // "$0.62/mi" -> 0.62   "$0.70–$0.80" -> 0.75 (midpoint)   "33%" -> null
  function parseRpm(pay) {
    if (!pay) return null;
    var nums = String(pay).match(/\$\s*(\d+(?:\.\d+)?)/g);
    if (!nums) return null;
    var vals = nums.map(function (n) { return parseFloat(n.replace(/[^0-9.]/g, '')); })
                   .filter(function (v) { return v > 0 && v < 5; });   // cents-per-mile range
    if (!vals.length) return null;
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / vals.length) * 100) / 100;
  }

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  // The detail frames. Only the ones the admin filled in are rendered, so a
  // sparse offer doesn't show a wall of em-dashes.
  function frames(o) {
    var items = [
      ['Home time', o.home_time],
      ['Escrow', o.escrow],
      ['Sign-on', o.sign_on],
      ['Insurance', o.insurance],
      ['Equipment', o.equipment],
      ['Route', o.route],
      ['Location', o.location]
    ].filter(function (p) { return p[1]; });
    if (!items.length) return '';
    return '<div class="oc-frames">' + items.map(function (p) {
      return '<div class="oc-frame"><span class="k">' + esc(p[0]) + '</span>' +
             '<span class="v">' + esc(p[1]) + '</span></div>';
    }).join('') + '</div>';
  }

  function calculator(o, id) {
    var rpm = (o.rpm != null && o.rpm !== '' ? parseFloat(o.rpm) : null) || parseRpm(o.pay);
    var miles = parseInt(o.avg_miles, 10) || 2500;
    // Percentage-pay offers ("90% – 11k avg gross") have no cents-per-mile to
    // work from — the calculator is hidden rather than inventing a rate.
    if (!rpm) return '';
    return '' +
      '<div class="oc-calc" data-calc="' + id + '" data-rpm="' + rpm + '">' +
        '<div class="oc-calc-head">Pay calculator<span>estimate</span></div>' +
        '<label class="oc-ctl">' +
          '<span class="lab">Miles per week<b data-out="miles">' + miles.toLocaleString('en-US') + '</b></span>' +
          '<input type="range" name="miles" min="1000" max="4000" step="50" value="' + miles + '">' +
        '</label>' +
        '<label class="oc-ctl">' +
          '<span class="lab">Rate per mile<b data-out="rpm">$' + rpm.toFixed(2) + '</b></span>' +
          '<div class="oc-step">' +
            '<button type="button" data-rpm-step="-0.01" aria-label="Lower the rate">−</button>' +
            '<input type="range" name="rpm" min="0.30" max="1.20" step="0.01" value="' + rpm + '">' +
            '<button type="button" data-rpm-step="0.01" aria-label="Raise the rate">+</button>' +
          '</div>' +
        '</label>' +
        '<div class="oc-calc-out">' +
          '<div><span class="k">Weekly</span><span class="v" data-out="week">—</span></div>' +
          '<div><span class="k">Monthly</span><span class="v" data-out="month">—</span></div>' +
          '<div><span class="k">Yearly</span><span class="v" data-out="year">—</span></div>' +
        '</div>' +
        '<p class="oc-calc-note">Gross before deductions. Based on the carrier\'s posted rate — your offer is confirmed by the recruiter.</p>' +
      '</div>';
  }

  // logo: rendered black-and-white regardless of the source artwork (see the
  // .oc-logo filter in home.css).
  function logo(o) {
    if (!o.logo_url) return '';
    return '<div class="oc-logo"><img src="' + esc(o.logo_url) + '" alt="' + esc(o.company || '') + ' logo" loading="lazy"></div>';
  }

  function card(o, i) {
    var id = 'oc' + (o.id || i || Math.random().toString(36).slice(2, 8));
    var loc = [o.location, o.route].filter(Boolean).map(esc).join(' · ');
    var tags = (o.tags && o.tags.length ? o.tags : [o.equipment].filter(Boolean))
      .slice(0, 4).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var detail = frames(o) + calculator(o, id) +
      (o.notes ? '<div class="oc-notes"><span class="k">Notes from the recruiter</span><p>' + esc(o.notes) + '</p></div>' : '');

    return '' +
      '<article class="card offer-card edge-top reveal in" data-offer="' + id + '">' +
        '<button class="oc-hit" type="button" aria-expanded="false" aria-controls="' + id + '-d">' +
          '<span class="oc-head">' +
            logo(o) +
            '<span class="oc-id">' +
              '<span class="oc-co">' + esc(o.company || 'Verified carrier') + '</span>' +
              (loc ? '<span class="oc-loc">' + loc + '</span>' : '') +
            '</span>' +
          '</span>' +
          '<span class="oc-payline">' +
            '<span class="oc-pay">' + esc(o.pay || '') + '</span>' +
            '<span class="oc-more">Details' + CHEV + '</span>' +
          '</span>' +
        '</button>' +
        (tags ? '<div class="oc-meta">' + tags + '</div>' : '') +
        '<div class="oc-detail" id="' + id + '-d" hidden>' + detail + '</div>' +
        '<div class="oc-foot">' +
          '<span class="pill live"><span class="dot"></span>' + esc(o.badge || 'Hiring now') + '</span>' +
          '<a href="apply.html">Apply' + ARROW + '</a>' +
        '</div>' +
      '</article>';
  }

  function runCalc(box) {
    var miles = +box.querySelector('input[name="miles"]').value;
    var rpm = +box.querySelector('input[name="rpm"]').value;
    var week = miles * rpm;
    box.querySelector('[data-out="miles"]').textContent = miles.toLocaleString('en-US');
    box.querySelector('[data-out="rpm"]').textContent = '$' + rpm.toFixed(2);
    box.querySelector('[data-out="week"]').textContent = money(week);
    box.querySelector('[data-out="month"]').textContent = money(week * 4.33);
    box.querySelector('[data-out="year"]').textContent = money(week * 52);
  }

  function bind(container) {
    if (!container || container.__ocBound) return;
    container.__ocBound = true;

    container.addEventListener('click', function (e) {
      // calculator +/- buttons
      var step = e.target.closest('[data-rpm-step]');
      if (step) {
        var box = step.closest('.oc-calc');
        var input = box.querySelector('input[name="rpm"]');
        input.value = (Math.max(+input.min, Math.min(+input.max, +input.value + parseFloat(step.getAttribute('data-rpm-step'))))).toFixed(2);
        runCalc(box);
        return;
      }
      var hit = e.target.closest('.oc-hit');
      if (!hit || !container.contains(hit)) return;
      var cardEl = hit.closest('.offer-card');
      var panel = cardEl.querySelector('.oc-detail');
      var open = cardEl.classList.toggle('is-open');
      hit.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
      if (open) {
        var calc = panel.querySelector('.oc-calc');
        if (calc) runCalc(calc);
        // A card that grows taller than the viewport is disorienting if the
        // page doesn't follow it.
        var top = cardEl.getBoundingClientRect().top;
        if (top < 90 || top > innerHeight * 0.6) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    container.addEventListener('input', function (e) {
      var box = e.target.closest('.oc-calc');
      if (box) runCalc(box);
    });
  }

  window.USROffers = { card: card, bind: bind, parseRpm: parseRpm };
})();
