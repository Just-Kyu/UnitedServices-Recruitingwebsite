/* Homepage entry point. Everything here is an enhancement — the page is
 * complete and every CTA works with this file blocked. */

import { getOffers } from './data.js';
import { store } from './store.js';
import { wireContact, initCounters, initFaq, initReveal } from './common.js';
import { initMarquees } from './marquee.js';
import { initMatcher } from './matcher.js';
import { initBoard } from './board.js';
import { initCalculator } from './calculator.js';
import { initMenu } from './menu.js';
import { initHeroReveal } from './hero-reveal.js';

document.documentElement.classList.remove('no-js');

/* trailer row feeds the matcher, then takes you to the board */
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
