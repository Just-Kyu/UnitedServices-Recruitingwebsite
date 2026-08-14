/* Entry point. Everything here is an enhancement — the page is complete and
 * every CTA works with this file blocked. */

import { getOffers, CONTACT } from './data.js';
import { store } from './store.js';
import { initMarquees } from './marquee.js';
import { initMatcher } from './matcher.js';
import { initBoard } from './board.js';
import { initCalculator } from './calculator.js';
import { initMenu } from './menu.js';
import { initHeroReveal } from './hero-reveal.js';

document.documentElement.classList.remove('no-js');

/* ── contact: one number, written from CONTACT ── */
function wireContact() {
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

/* ── D9: counters animate from the value already in the HTML, never from 0 ── */
function initCounters() {
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

/* ── FAQ ── */
function initFaq() {
  for (const q of document.querySelectorAll('.faq__q')) {
    q.addEventListener('click', () => {
      const open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', String(!open));
      q.querySelector('.faq__sign').textContent = open ? '+' : '–';
    });
  }
}

/* ── scroll reveal ── */
function initReveal() {
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

/* ── trailer row feeds the matcher, then takes you to the board ── */
function initRigs() {
  const rigs = document.querySelectorAll('[data-chip]');
  for (const rig of rigs) {
    if (rig.classList.contains('chip')) continue; // matcher owns its own chips
    rig.addEventListener('click', () => {
      store.add(rig.dataset.chip);
      document.getElementById('board-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  store.subscribe(sel => {
    for (const rig of rigs) {
      if (rig.classList.contains('chip')) continue;
      rig.setAttribute('aria-pressed', String(sel.includes(rig.dataset.chip)));
    }
  });
}

/* ── clear-filters affordance ── */
function initClear() {
  const btn = document.getElementById('clear-filters');
  if (!btn) return;
  btn.addEventListener('click', () => store.clear());
  store.subscribe(sel => { btn.hidden = sel.length === 0; });
}

wireContact();
initMenu();
initMarquees();
initCounters();
initFaq();
initReveal();
initRigs();
initClear();
initCalculator();
initHeroReveal();

getOffers().then(offers => {
  initMatcher(offers);
  initBoard(offers);
});
