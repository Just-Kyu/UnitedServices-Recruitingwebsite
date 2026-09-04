/* United Services — carrier partner strip
 *
 * A row of partner marks looping across a black band. The loop is seamless by
 * construction rather than by measurement: the list is repeated enough times
 * to overflow the viewport (one "run"), the run is rendered twice, and the
 * animation translates by exactly -50%. At that point run two sits precisely
 * where run one started, so the restart is invisible — no jump, no gap, no
 * dependence on image widths being measured correctly.
 *
 * To add a carrier: put the file in public/assets/partners/ and add a line.
 * With an empty list the section removes itself.
 */
window.USR_PARTNERS = [
  // scale: optical size next to the others. A tall badge needs more height
  // than a wide wordmark to carry the same weight.
  { name: 'DGLIFE Logistics',       file: 'dglife.png' },
  { name: 'Premier Trucking Group', file: 'ptg.png' },
  { name: 'Ryan LLC',               file: 'ryan.png' },
  { name: 'SCJ Cartage LLC',        file: 'scj.png', scale: 1.5 },
  { name: 'RBY Trucking',           file: 'rby.png', scale: 1.5 }
];

(function () {
  'use strict';
  var section = document.getElementById('partners');
  var track = document.getElementById('partner-track');
  var list = window.USR_PARTNERS || [];
  if (!section || !track) return;
  if (!list.length) { section.remove(); return; }

  var SPEED = 46;              // px per second
  var APPROX_MARK = 260;       // rough width of one mark incl. padding

  function esc(s) { return String(s).replace(/"/g, '&quot;'); }
  function mark(p) {
    return '<div class="pt-mark"' + (p.scale ? ' style="--s:' + p.scale + '"' : '') +
           '><img src="assets/partners/' + encodeURIComponent(p.file) + '?v=34' +
           '" alt="' + esc(p.name) + '" loading="eager" decoding="async" draggable="false"></div>';
  }

  function build() {
    // One run must be at least as wide as the viewport, or a gap opens up at
    // the seam on wide screens.
    var perRun = Math.max(list.length, Math.ceil(innerWidth / APPROX_MARK) + list.length);
    var reps = Math.ceil(perRun / list.length);
    var run = '';
    for (var i = 0; i < reps; i++) run += list.map(mark).join('');
    track.innerHTML = run + run;                       // exactly two runs
    return reps;
  }

  var reps = build();

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    track.classList.add('is-static');
    return;
  }

  // Duration from the measured run width, so speed stays constant however
  // many logos are listed. If the measurement is off the loop is still
  // seamless — only the pace shifts slightly.
  function setPace() {
    var runWidth = track.scrollWidth / 2;
    if (!runWidth) return;
    track.style.animationDuration = (runWidth / SPEED) + 's';
  }

  var imgs = track.querySelectorAll('img'), left = imgs.length;
  imgs.forEach(function (img) {
    if (img.complete) { if (!--left) setPace(); }
    else img.addEventListener('load', function () { if (!--left) setPace(); }, { once: true });
  });
  setPace();

  var t;
  addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var next = Math.ceil(Math.max(list.length, Math.ceil(innerWidth / APPROX_MARK) + list.length) / list.length);
      if (next !== reps) { reps = build(); }
      setPace();
    }, 200);
  }, { passive: true });
})();
