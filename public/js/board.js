/* The board. Same offers array the matcher counts, filtered by the same
 * selection — the two cannot drift apart.
 *
 * Example rows get a visible label and NO apply button. A placeholder must
 * never look like a live opening with a working application. */

import { matches, isExampleSet, CONTACT } from './data.js';
import { store } from './store.js';

function cell(label, value, sub) {
  const d = document.createElement('div');
  d.className = 'board__cell';
  const k = document.createElement('div');
  k.className = 'k';
  k.textContent = label;
  const v = document.createElement('div');
  v.className = 'v';
  v.textContent = value;
  d.append(k, v);
  if (sub) {
    const s = document.createElement('div');
    s.className = 'v-sub';
    s.textContent = sub;
    d.appendChild(s);
  }
  return d;
}

export function initBoard(offers) {
  const wrap = document.getElementById('board');
  const note = document.getElementById('board-note');
  if (!wrap) return;

  const examples = isExampleSet(offers);
  if (note) {
    note.textContent = examples
      ? 'No live rows published yet — these are the kinds of roles we place. Call a recruiter for what is open today.'
      : `${offers.length} live ${offers.length === 1 ? 'role' : 'roles'} · updated as carriers post them`;
  }

  store.subscribe(sel => {
    const hits = offers.filter(o => matches(o, sel));
    wrap.textContent = '';

    if (!hits.length) {
      const e = document.createElement('div');
      e.className = 'board__empty';
      e.textContent = 'Nothing on the board matches that combination right now — clear a filter, or call a recruiter and we will go looking.';
      wrap.appendChild(e);
      return;
    }

    for (const o of hits) {
      const row = document.createElement('div');
      row.className = 'board__row';

      const first = document.createElement('div');
      first.className = 'board__cell';
      const k = document.createElement('div');
      k.className = 'k';
      k.textContent = o.isExample ? 'Example role' : 'Carrier';
      const b = document.createElement('b');
      b.textContent = o.carrier;
      first.append(k, b);

      row.append(
        first,
        cell('Equipment', `${o.equipment} · ${o.route}`),
        cell('Pay', o.pay.primary, o.pay.alt),
        cell('Home time', o.homeTime),
        cell('Requires', o.requires)
      );

      if (o.isExample) {
        // Honest dead-end: talk to a person instead of a fake application.
        const a = document.createElement('a');
        a.className = 'btn btn--ghost';
        a.href = `tel:${CONTACT.phone}`;
        a.textContent = 'Ask what is open';
        row.appendChild(a);
      } else {
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = `apply.html?role=${encodeURIComponent(o.id)}`;
        a.textContent = 'Apply →';
        row.appendChild(a);
      }
      wrap.appendChild(row);
    }
  });
}
