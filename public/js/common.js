/* Shared page plumbing — used by every new-design page. */

import { CONTACT } from './data.js';

/* One number, one email, written from CONTACT everywhere. */
export function wireContact() {
  for (const el of document.querySelectorAll('[data-phone]')) {
    el.href = `tel:${CONTACT.phone}`;
    if (el.dataset.phone === 'text') el.textContent = CONTACT.phoneDisplay;
  }
  for (const el of document.querySelectorAll('[data-phone-text]')) el.textContent = CONTACT.phoneDisplay;
  for (const el of document.querySelectorAll('[data-email]')) {
    el.href = `mailto:${CONTACT.email}`;
    el.textContent = CONTACT.email;
  }
}

/* D9: counters animate from the value already in the HTML, never from 0. */
export function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return; // static value stands

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target;
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target)) continue;
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 900;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.4 });
  for (const el of els) io.observe(el);
}

export function initFaq() {
  for (const q of document.querySelectorAll('.faq__q')) {
    q.addEventListener('click', () => {
      const open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', String(!open));
      q.querySelector('.faq__sign').textContent = open ? '+' : '–';
    });
  }
}

export function initReveal() {
  const els = document.querySelectorAll('.rv');
  if (!els.length) return;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const el of els) el.classList.add('in');
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const el of els) io.observe(el);
}
