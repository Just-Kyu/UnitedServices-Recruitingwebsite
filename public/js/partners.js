/* United Services — carrier partner strip
 *
 * A continuous run of partner marks on pure black: it drifts on its own, both
 * edges fade out, and it can be grabbed and flung by hand. Logos are supplied
 * as white-on-transparent PNGs so nothing needs recolouring at runtime.
 *
 * To add a carrier: put the file in public/assets/partners/ and add a line.
 * With an empty list the whole section removes itself — a faked partner wall
 * is worse than none.
 */
window.USR_PARTNERS = [
  { name: 'DGLIFE Logistics',     file: 'dglife.png' },
  { name: 'Premier Trucking Group', file: 'ptg.png' },
  { name: 'Ryan LLC',             file: 'ryan.png' },
  { name: 'SCJ Cartage LLC',      file: 'scj.png' }
];

(function () {
  'use strict';
  var section = document.getElementById('partners');
  var viewport = document.getElementById('partner-viewport');
  var track = document.getElementById('partner-track');
  var list = window.USR_PARTNERS || [];
  if (!section || !track) return;
  if (!list.length) { section.remove(); return; }

  function esc(s) { return String(s).replace(/"/g, '&quot;'); }
  function mark(p) {
    return '<div class="pt-mark"><img src="assets/partners/' + encodeURIComponent(p.file) +
           '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" draggable="false"></div>';
  }

  // Enough copies that the row always overflows the viewport — otherwise a
  // short list leaves a visible gap between loops on a wide screen.
  var copies = Math.max(2, Math.ceil((innerWidth * 2) / (list.length * 260)) + 1);
  var html = '';
  for (var i = 0; i < copies; i++) html += list.map(mark).join('');
  track.innerHTML = html;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { track.classList.add('is-static'); return; }

  var runWidth = 0, x = 0, speed = 34;      // px per second, leftward
  var dragging = false, lastPointer = 0, velocity = 0, lastT = 0, raf = null;

  function measure() {
    // One "run" is the full list once: wrapping by that width makes the loop
    // seamless whatever the logo widths are.
    runWidth = track.scrollWidth / copies;
  }
  function wrap() {
    if (!runWidth) return;
    while (x <= -runWidth) x += runWidth;
    while (x > 0) x -= runWidth;
  }
  function frame(t) {
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    if (dragging) {
      // position is driven by the pointer
    } else if (Math.abs(velocity) > 4) {
      x += velocity * dt;                    // fling, decaying
      velocity *= Math.pow(0.0015, dt);
    } else {
      velocity = 0;
      x -= speed * dt;                       // back to the steady drift
    }
    wrap();
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
    raf = requestAnimationFrame(frame);
  }

  function onDown(e) {
    dragging = true; velocity = 0;
    lastPointer = e.clientX;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture && viewport.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!dragging) return;
    var dx = e.clientX - lastPointer;
    lastPointer = e.clientX;
    x += dx;
    velocity = dx * 45;                      // carry the throw into the fling
    wrap();
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
  }

  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('pointerleave', onUp);
  // A horizontal drag on the strip shouldn't also scroll the page sideways.
  viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

  addEventListener('resize', measure, { passive: true });
  // Images arrive after layout; measure once they're in or the run width is wrong.
  var imgs = track.querySelectorAll('img'), left = imgs.length;
  if (!left) measure();
  imgs.forEach(function (img) {
    if (img.complete) { if (!--left) measure(); }
    else img.addEventListener('load', function () { if (!--left) measure(); }, { once: true });
  });
  measure();
  raf = requestAnimationFrame(frame);
})();
