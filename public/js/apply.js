/* United Services Recruiting — Apply multi-step form logic */
(function () {
  'use strict';
  var root = document.getElementById('apply-form');
  if (!root) return;

  var steps = [].slice.call(root.querySelectorAll('.apply-step'));
  var dots = [].slice.call(document.querySelectorAll('.step-dot'));
  var lines = [].slice.call(document.querySelectorAll('.step-bar-line'));
  var labels = [].slice.call(document.querySelectorAll('.step-labels span'));
  var navBack = document.getElementById('btn-back');
  var navNext = document.getElementById('btn-next');
  var nav = document.getElementById('apply-nav');
  var current = 0;
  var data = {};

  var checkIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  // keyboard activation for span-based option chips (Enter / Space)
  function keyActivate(el) {
    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); el.click(); }
    });
  }

  // ---- equipment multi-select ----
  root.querySelectorAll('.eq-opt').forEach(function (o) {
    o.setAttribute('role', 'button');
    o.setAttribute('aria-pressed', 'false');
    keyActivate(o);
    o.addEventListener('click', function () {
      o.classList.toggle('on');
      o.setAttribute('aria-pressed', o.classList.contains('on') ? 'true' : 'false');
    });
  });
  // ---- segmented single-select ----
  root.querySelectorAll('.seg').forEach(function (seg) {
    seg.querySelectorAll('.seg-opt').forEach(function (o) {
      o.setAttribute('role', 'radio');
      o.setAttribute('aria-checked', 'false');
      keyActivate(o);
      o.addEventListener('click', function () {
        seg.querySelectorAll('.seg-opt').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        o.classList.add('on');
        o.setAttribute('aria-checked', 'true');
        seg.removeAttribute('data-err');
        var fl = seg.closest('.field'); if (fl) fl.classList.remove('err');
      });
    });
  });
  // ---- file upload ----
  var fileInput = document.getElementById('resume');
  var upload = document.getElementById('upload');
  if (upload && fileInput) {
    upload.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length) {
        upload.classList.add('has-file');
        upload.querySelector('.up-main').textContent = fileInput.files[0].name;
        upload.querySelector('.up-sub').textContent = 'Tap to replace';
      }
    });
  }
  // clear errors on input
  root.querySelectorAll('input,select').forEach(function (f) {
    f.addEventListener('input', function () { var fl = f.closest('.field'); if (fl) fl.classList.remove('err'); });
  });

  function validate(stepEl) {
    var ok = true;
    stepEl.querySelectorAll('[data-required]').forEach(function (f) {
      var fl = f.closest('.field');
      var valid = true;
      if (f.tagName === 'INPUT' || f.tagName === 'SELECT') {
        valid = !!f.value.trim();
        if (valid && f.type === 'email') valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value);
        if (valid && f.type === 'tel') valid = f.value.replace(/\D/g, '').length >= 10;
      }
      if (!valid) { ok = false; if (fl) fl.classList.add('err'); }
    });
    // required segmented groups
    stepEl.querySelectorAll('.seg[data-required-seg]').forEach(function (seg) {
      if (!seg.querySelector('.seg-opt.on')) {
        ok = false;
        seg.setAttribute('data-err', '1');
        var fl = seg.closest('.field'); if (fl) fl.classList.add('err');
      }
    });
    return ok;
  }

  function collect() {
    data.name = val('full-name'); data.phone = val('phone'); data.email = val('email');
    data.cls = val('cdl-class'); data.years = val('experience');
    data.equipment = [].map.call(root.querySelectorAll('.eq-opt.on'), function (o) { return o.textContent; }).join(', ') || '—';
    var routeSel = root.querySelector('#route-seg .seg-opt.on'); data.route = routeSel ? routeSel.textContent : '—';
    var milesSel = root.querySelector('#miles-seg .seg-opt.on'); data.miles = milesSel ? milesSel.textContent : '—';
    var sapSel = root.querySelector('#sap-seg .seg-opt.on'); data.sap = sapSel ? sapSel.textContent : '—';
    data.location = val('location');
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function goTo(n) {
    steps[current].classList.remove('active');
    current = n;
    steps[current].classList.add('active');
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === current);
      d.classList.toggle('done', i < current);
      if (i < current) d.innerHTML = checkIco; else d.textContent = (i + 1);
    });
    lines.forEach(function (l, i) { l.classList.toggle('filled', i < current); });
    labels.forEach(function (l, i) { l.classList.toggle('active', i === current); });
    nav.classList.toggle('show-back', current > 0);
    navNext.innerHTML = (current === steps.length - 1)
      ? 'Submit application<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
      : 'Continue<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navNext.addEventListener('click', function () {
    if (navNext.disabled) return;
    if (!validate(steps[current])) return;
    if (current < steps.length - 1) { goTo(current + 1); }
    else { submit(); }
  });
  navBack.addEventListener('click', function () { if (current > 0) goTo(current - 1); });

  function submit() {
    collect();
    navNext.disabled = true;
    var ref = localRef();
    var row = {
      ref: ref,
      name: data.name,
      phone: val('phone'),
      email: val('email'),
      cdl_class: data.cls || null,
      years: data.years || null,
      equipment: data.equipment && data.equipment !== '—'
        ? data.equipment.split(', ').filter(Boolean)
        : null,
      route: data.route && data.route !== '—' ? data.route : null,
      weekly_miles: data.miles && data.miles !== '—' ? data.miles : null,
      sap_status: data.sap && data.sap !== '—' ? data.sap : null,
      location: data.location || null,
      notes: val('notes') || null,
      user_agent: (navigator && navigator.userAgent) || null
    };
    // Honeypot: the visually-hidden "website" field is only ever filled by
    // bots. Show them the success screen but never store the row.
    var hp = document.getElementById('website');
    if (hp && hp.value) { showSuccess(ref); return; }
    var sb = window.usrSupabase;
    if (!sb) {
      // Supabase not configured (e.g. opened as a static file or keys missing).
      // Still show the user a confirmation so the experience isn't broken.
      console.warn('Supabase not configured — driver lead not persisted.');
      if (window.usrTrack) window.usrTrack('generate_lead', { form: 'driver_application', reference: ref });
      showSuccess(ref);
      return;
    }
    // A driver who sees a reference number believes they have applied. If the
    // insert failed, nobody has their details — say so and give them a way
    // through instead of handing out a number that means nothing.
    function done(res) {
      if (res.error) {
        console.warn('driver_leads insert failed:', res.error.message);
        showFailure();
        return;
      }
      showSuccess(ref);
    }
    // weekly_miles arrived after the table did. Until supabase/leads-extras.sql
    // is run the column is missing, and an application must not be lost over a
    // field nobody has asked for yet — so drop it and send the rest.
    sb.from('driver_leads').insert(row).then(function (res) {
      if (res.error && /weekly_miles/.test(res.error.message || '')) {
        delete row.weekly_miles;
        sb.from('driver_leads').insert(row).then(done);
        return;
      }
      done(res);
    });
  }
  function localRef() { return (window.usrRef ? window.usrRef('USR') : 'USR-' + Math.floor(100000 + Math.random() * 899999)); }
  function showSuccess(ref) {
    document.getElementById('apply-shell').style.display = 'none';
    var sum = document.getElementById('summary');
    if (sum) {
      sum.innerHTML =
        line('Name', data.name) + line('License', data.cls) + line('Experience', data.years) +
        line('Equipment', data.equipment) + line('Route', data.route) +
        line('Weekly miles', data.miles) + line('SAP status', data.sap);
    }
    var refEl = document.getElementById('ref-num'); if (refEl) refEl.textContent = ref;
    document.getElementById('apply-success').classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function showFailure() {
    var shell = document.getElementById('apply-shell');
    var box = document.getElementById('apply-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'apply-error';
      box.className = 'apply-error';
      box.innerHTML =
        '<h3>We couldn\'t send your application</h3>' +
        '<p>Something went wrong on our side — your details did not reach us, so please don\'t wait on a call. ' +
        'Call, message or email us and we\'ll take it down directly, or try submitting again in a minute.</p>' +
        '<div class="apply-error-row">' +
          '<a class="btn btn-chrome" href="tel:+14402968338">Call (440) 296-8338</a>' +
          '<a class="btn btn-ghost" href="https://t.me/UnitedServices_Recruiting" target="_blank" rel="noopener">Telegram</a>' +
          '<a class="btn btn-ghost" href="mailto:recruiting@us-unitedservices.com">Email us</a>' +
        '</div>';
      (shell && shell.parentNode ? shell.parentNode : document.body).insertBefore(box, shell);
    }
    box.hidden = false;
    if (navNext) { navNext.disabled = false; navNext.textContent = 'Try again'; }
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function line(k, v) { return '<div class="s-line"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v || '—') + '</span></div>'; }

  goTo(0);
})();
