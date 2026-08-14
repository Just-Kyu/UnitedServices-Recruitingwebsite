/* Matcher — chips + the live count.
 *
 * The count is ALWAYS offers.filter(matches).length. There is no hard-coded
 * number anywhere in this file; that is what let the old matcher advertise
 * inventory the board didn't have. */

import { CHIPS, matches, isExampleSet } from './data.js';
import { store } from './store.js';

export function initMatcher(offers) {
  const chipWrap = document.getElementById('matcher-chips');
  const nEl = document.getElementById('tally-n');
  const capEl = document.getElementById('tally-cap');
  const listEl = document.getElementById('tally-list');
  if (!chipWrap || !nEl) return;

  const examples = isExampleSet(offers);

  // Only offer chips that can actually match something — a chip that always
  // returns zero is a dead end the driver has to discover by tapping it.
  const usable = CHIPS.filter(c => offers.some(c.test));
  chipWrap.textContent = '';
  for (const c of usable) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = c.label;
    b.setAttribute('aria-pressed', 'false');
    b.dataset.chip = c.key;
    b.addEventListener('click', () => store.toggle(c.key));
    chipWrap.appendChild(b);
  }

  store.subscribe(sel => {
    for (const b of chipWrap.querySelectorAll('.chip')) {
      b.setAttribute('aria-pressed', String(sel.includes(b.dataset.chip)));
    }
    const hits = offers.filter(o => matches(o, sel));
    nEl.textContent = String(hits.length);
    if (capEl) {
      capEl.textContent = examples
        ? 'Example roles — ask a recruiter what is open today'
        : (sel.length ? 'Roles on the board that fit' : 'Roles on the board right now');
    }
    if (listEl) {
      listEl.textContent = '';
      for (const o of hits.slice(0, 3)) {
        const li = document.createElement('li');
        const b = document.createElement('b');
        b.textContent = `${o.equipment} · ${o.route}`;
        const s = document.createElement('span');
        s.textContent = o.pay.primary;
        li.append(b, s);
        listEl.appendChild(li);
      }
    }
  });
}
