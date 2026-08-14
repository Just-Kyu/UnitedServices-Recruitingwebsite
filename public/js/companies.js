/* For Carriers page: driver pool board + request form + split-flap hero. */

import { getDrivers, isExampleSet, submitCompanyLead, CONTACT } from './data.js';
import { wireContact, initCounters, initReveal } from './common.js';
import { initMenu } from './menu.js';
import { initFlap } from './flap.js';

document.documentElement.classList.remove('no-js');

/* ── driver pool ── */
function renderPool(drivers) {
  const wrap = document.getElementById('pool');
  const note = document.getElementById('pool-note');
  if (!wrap) return;

  const examples = isExampleSet(drivers);
  if (note) {
    note.textContent = examples
      ? 'No profiles published right now — these are the driver shapes we typically hold. Tell us the seat and we go to the pool.'
      : `${drivers.length} anonymised ${drivers.length === 1 ? 'profile' : 'profiles'} · contact details released only after you request an intro`;
  }

  wrap.textContent = '';
  for (const d of drivers) {
    const card = document.createElement('article');
    card.className = 'dcard';

    const top = document.createElement('div');
    top.className = 'dcard__top';
    const h = document.createElement('h3');
    h.textContent = d.isExample ? 'Example profile' : d.handle;
    const loc = document.createElement('span');
    loc.className = 'dcard__loc';
    loc.textContent = d.location;
    top.append(h, loc);
    card.appendChild(top);

    const rows = [
      ['Class', d.cdl],
      ['Experience', d.years],
      ['Equipment', d.equipment],
      ['Route', d.route],
      ['Record', d.clearance]
    ];
    for (const [k, v] of rows) {
      const r = document.createElement('div');
      r.className = 'dcard__row';
      const kk = document.createElement('span'); kk.className = 'k'; kk.textContent = k;
      const vv = document.createElement('span'); vv.className = 'v'; vv.textContent = v;
      r.append(kk, vv);
      card.appendChild(r);
    }

    const a = document.createElement('a');
    a.className = 'btn btn--ghost btn--wide';
    a.style.marginTop = '18px';
    if (d.isExample) {
      a.href = `tel:${CONTACT.phone}`;
      a.textContent = 'Ask who is on file';
    } else {
      a.href = '#request';
      a.textContent = 'Request this driver';
      a.addEventListener('click', () => {
        const notes = document.getElementById('f-notes');
        if (notes && !notes.value.includes(d.handle)) {
          notes.value = (notes.value ? notes.value + '\n' : '') + `Interested in ${d.handle} (${d.equipment} · ${d.route}).`;
        }
      });
    }
    card.appendChild(a);
    wrap.appendChild(card);
  }
}

/* ── request form ── */
function initForm() {
  const form = document.getElementById('request-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // honeypot: bots that fill it get a silent success
    if (form.querySelector('#f-website')?.value) { done(); return; }

    let ok = true;
    for (const f of form.querySelectorAll('[required]')) {
      f.classList.toggle('is-bad', !f.value.trim());
      if (!f.value.trim()) ok = false;
    }
    const email = form.querySelector('#f-email');
    if (email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
      email.classList.add('is-bad'); ok = false;
    }
    if (!ok) { status.textContent = 'Fill the marked fields and try again.'; return; }

    btn.disabled = true;
    status.textContent = 'Sending…';
    try {
      await submitCompanyLead({
        company: form.querySelector('#f-co').value.trim(),
        name: form.querySelector('#f-name').value.trim(),
        email: email.value.trim(),
        phone: form.querySelector('#f-phone').value.trim(),
        equipment: form.querySelector('#f-eq').value,
        hireCount: form.querySelector('#f-count').value,
        notes: form.querySelector('#f-notes').value.trim()
      });
      done();
    } catch (err) {
      // Honest failure: no fake success. The phone number IS the fallback.
      btn.disabled = false;
      status.textContent = `Could not send right now — call ${CONTACT.phoneDisplay} and we will take it over the phone.`;
    }
  });

  for (const f of form.querySelectorAll('input,select,textarea')) {
    f.addEventListener('input', () => f.classList.remove('is-bad'));
  }

  function done() {
    form.hidden = true;
    const ok = document.getElementById('form-ok');
    ok.hidden = false;
    ok.focus();
  }
}

wireContact();
initMenu();
initCounters();
initReveal();
initForm();
initFlap(document.getElementById('flap'), [
  'DRY VAN', 'FLATBED', 'REEFER', 'STEP DECK', 'TANKER', 'POWER ONLY',
  'CAR HAULER', 'OTR', 'REGIONAL', 'DEDICATED', 'TEAM', 'SAP-CLEARED'
]);
getDrivers().then(renderPool);
