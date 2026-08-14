/* Equipment convoy + routes strip.
 *
 * Ported from the previous site's equip.js — this is the trailer animation we
 * deliberately kept. It beats a CSS marquee in three ways that matter here:
 * you can drag/swipe to scrub it, it hands off into inertia when you let go,
 * and it slows (rather than stops) on hover so the row never feels frozen.
 *
 * Accessibility: both tracks freeze under prefers-reduced-motion and pause on
 * :hover / :focus-within, so a keyboard user tabbing through the trailer
 * buttons isn't chasing a moving target.
 */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(viewport, track, opts) {
  const { speed = 36, drag = false } = opts || {};
  if (!viewport || !track) return;

  // Duplicate the row once so the wrap-around has no visible seam.
  for (const el of Array.from(track.children)) {
    const clone = el.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    // Clones must never be reachable by keyboard or repeat an ID.
    clone.removeAttribute('id');
    for (const node of clone.querySelectorAll('button, a, input, [tabindex], [id]')) {
      node.setAttribute('tabindex', '-1');
      node.removeAttribute('id');
    }
    if (clone.matches('button, a, input, [tabindex]')) clone.setAttribute('tabindex', '-1');
    track.appendChild(clone);
  }

  let offset = 0, half = 0, velocity = 0;
  let dragging = false, paused = false;
  let startX = 0, startOffset = 0, lastX = 0, lastT = 0, pointerId = null;
  const DECAY = 1.6;

  const measure = () => { half = track.scrollWidth / 2; };
  measure();
  addEventListener('load', measure);
  addEventListener('resize', measure);

  viewport.addEventListener('pointerenter', () => { paused = true; });
  viewport.addEventListener('pointerleave', () => { paused = false; });
  viewport.addEventListener('focusin', () => { paused = true; });
  viewport.addEventListener('focusout', () => { paused = false; });

  if (drag) {
    viewport.addEventListener('pointerdown', e => {
      if (e.button) return;
      dragging = true; pointerId = e.pointerId;
      startX = lastX = e.clientX; startOffset = offset;
      lastT = performance.now(); velocity = 0;
      viewport.classList.add('dragging');
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    });
    viewport.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      offset = startOffset + (e.clientX - startX);
      const now = performance.now(), dt = (now - lastT) / 1000;
      if (dt > 0) velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
    });
    const end = e => {
      if (!dragging || (e && e.pointerId !== undefined && e.pointerId !== pointerId)) return;
      dragging = false; pointerId = null;
      viewport.classList.remove('dragging');
      if (e && e.pointerId !== undefined) { try { viewport.releasePointerCapture(e.pointerId); } catch (_) {} }
    };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
  }

  // Only run the rAF loop while the row is actually on screen.
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { last = performance.now(); requestAnimationFrame(tick); }
    }, { rootMargin: '120px' }).observe(viewport);
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!dragging) {
      if (!reduce && !paused) offset -= speed * dt;
      if (Math.abs(velocity) > 1) {
        offset += velocity * dt;
        velocity *= Math.exp(-DECAY * dt);
      } else velocity = 0;
    }

    if (half > 0) {
      while (offset <= -half) offset += half;
      while (offset > 0) offset -= half;
    }
    track.style.transform = `translate3d(${offset.toFixed(2)}px,0,0)`;
    if (visible) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function initMarquees() {
  loop(document.getElementById('convoy'), document.getElementById('convoy-track'), { speed: 36, drag: true });
  loop(document.getElementById('routes'), document.getElementById('routes-track'), { speed: 60 });
}
