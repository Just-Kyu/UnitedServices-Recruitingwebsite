/* United Services Recruiting — equipment convoy.
 *
 * A horizontal trailer marquee under "Lanes for every rig." Auto-scrolls
 * right-to-left at a steady speed; users can drag/swipe to scrub manually
 * and the marquee resumes from wherever they let go (with a touch of
 * inertia so it feels physical). The track is duplicated once so the
 * wrap-around is seamless.
 */
(function () {
  'use strict';
  var convoy = document.getElementById('equip-convoy');
  var track = document.getElementById('equip-track');
  if (!convoy || !track) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Duplicate every rig once so we can wrap the offset without a visible jump.
  var original = Array.prototype.slice.call(track.children);
  original.forEach(function (rig) {
    var clone = rig.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  var offset = 0;                    // current translateX in px (≤ 0)
  var halfWidth = 0;                 // width of one copy of the rigs
  var autoSpeed = 36;                // px/s left-ward drift
  var velocity = 0;                  // px/s — used while inertia is decaying
  var inertiaDecay = 1.6;            // higher = stops sooner
  var isDragging = false;
  var dragStartX = 0;
  var dragStartOffset = 0;
  var lastPointerX = 0;
  var lastPointerTime = 0;
  var hovering = false;
  var activePointer = null;

  function measure() {
    // halfWidth = total track width / 2 (since we duplicated children once)
    halfWidth = track.scrollWidth / 2;
  }
  measure();
  // Re-measure once images/fonts settle.
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);

  var lastFrame = performance.now();
  function tick(now) {
    var delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    if (!isDragging) {
      var drift = autoSpeed;
      if (hovering) drift *= 0.35;                       // slow on hover, don't stop
      if (reduce) drift = 0;
      offset -= drift * delta;

      if (Math.abs(velocity) > 1) {
        offset += velocity * delta;
        velocity *= Math.exp(-inertiaDecay * delta);
      } else {
        velocity = 0;
      }
    }

    // Wrap so the marquee never reaches the end of the duplicated track
    if (halfWidth > 0) {
      while (offset <= -halfWidth) offset += halfWidth;
      while (offset > 0) offset -= halfWidth;
    }

    track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px, 0, 0)';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  convoy.addEventListener('mouseenter', function () { hovering = true; });
  convoy.addEventListener('mouseleave', function () { hovering = false; });

  convoy.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    activePointer = e.pointerId;
    dragStartX = e.clientX;
    dragStartOffset = offset;
    lastPointerX = e.clientX;
    lastPointerTime = performance.now();
    velocity = 0;
    convoy.classList.add('dragging');
    try { convoy.setPointerCapture(e.pointerId); } catch (_) {}
  });
  convoy.addEventListener('pointermove', function (e) {
    if (!isDragging || e.pointerId !== activePointer) return;
    var dx = e.clientX - dragStartX;
    offset = dragStartOffset + dx;
    // Track instantaneous velocity for hand-off into inertia
    var now = performance.now();
    var dt = (now - lastPointerTime) / 1000;
    if (dt > 0) velocity = (e.clientX - lastPointerX) / dt;
    lastPointerX = e.clientX;
    lastPointerTime = now;
  });
  function endDrag(e) {
    if (!isDragging) return;
    if (e && e.pointerId !== undefined && e.pointerId !== activePointer) return;
    isDragging = false;
    activePointer = null;
    convoy.classList.remove('dragging');
    if (e && e.pointerId !== undefined) {
      try { convoy.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }
  convoy.addEventListener('pointerup', endDrag);
  convoy.addEventListener('pointercancel', endDrag);
  convoy.addEventListener('pointerleave', function (e) {
    // pointerleave on capture is rare but guard anyway
    if (isDragging) endDrag(e);
  });
})();

/* Routes marquee — same loop pattern, drifts a touch faster, no drag. */
(function () {
  'use strict';
  var marquee = document.getElementById('routes-marquee');
  var track = document.getElementById('routes-track');
  if (!marquee || !track) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Duplicate the row once for a seamless wrap
  var original = Array.prototype.slice.call(track.children);
  original.forEach(function (el) {
    var clone = el.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  var offset = 0;
  var halfWidth = 0;
  var speed = 60;
  function measure() { halfWidth = track.scrollWidth / 2; }
  measure();
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);

  var last = performance.now();
  function tick(now) {
    var delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduce) offset -= speed * delta;
    if (halfWidth > 0) {
      while (offset <= -halfWidth) offset += halfWidth;
      while (offset > 0) offset -= halfWidth;
    }
    track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px, 0, 0)';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
