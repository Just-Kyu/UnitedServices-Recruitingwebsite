/* United Services — carrier partner logos
 *
 * Drop each logo file into public/assets/partners/ and add a line below.
 * Nothing else needs changing: the strip builds itself, renders every logo in
 * black and white to match the site, and duplicates the row so the loop is
 * seamless.
 *
 * If this list is empty the whole section stays hidden — an empty or faked
 * partner wall is worse than none at all.
 *
 *   { name: 'Cardinal Freightways', file: 'cardinal.png' }
 */
window.USR_PARTNERS = [
  // { name: 'Carrier name', file: 'carrier-logo.png' },
];

(function () {
  'use strict';
  var section = document.getElementById('partners');
  var track = document.getElementById('partner-track');
  var list = window.USR_PARTNERS || [];
  if (!section || !track) return;
  if (!list.length) { section.remove(); return; }   // no logos, no section

  function plate(p) {
    return '<div class="pt-plate" title="' + String(p.name).replace(/"/g, '&quot;') + '">' +
      '<img src="assets/partners/' + encodeURIComponent(p.file) + '" alt="' +
      String(p.name).replace(/"/g, '&quot;') + '" loading="lazy" decoding="async">' +
      '</div>';
  }
  // Two identical runs: the animation translates by exactly one run's width,
  // so the strip repeats without a visible seam or jump.
  var run = list.map(plate).join('');
  track.innerHTML = '<div class="pt-run">' + run + '</div><div class="pt-run" aria-hidden="true">' + run + '</div>';

  // Longer list, proportionally longer cycle — so speed stays constant no
  // matter how many carriers get added.
  track.style.setProperty('--pt-duration', Math.max(18, list.length * 4.5) + 's');
})();
