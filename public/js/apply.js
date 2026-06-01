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
    // Post to the API; gracefully fall back to a local reference if the
    // backend is unavailable (e.g. opened as a static file).
    function done(ref) { showSuccess(ref); }
    var payload = {
      name: data.name, phone: val('phone'), email: val('email'),
      cdlClass: data.cls, experience: data.years, equipment: data.equipment,
      route: data.route, sap: data.sap, location: data.location, notes: val('notes')
    };
    fetch('/api/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (res) { done(res && res.ref ? res.ref : localRef()); })
      .catch(function () { done(localRef()); });
  }
  function localRef() { return 'USR-' + Math.floor(100000 + Math.random() * 899999); }
  function showSuccess(ref) {
    document.getElementById('apply-shell').style.display = 'none';
    var sum = document.getElementById('summary');
    if (sum) {
      sum.innerHTML =
        line('Name', data.name) + line('License', data.cls) + line('Experience', data.years) +
        line('Equipment', data.equipment) + line('Route', data.route) + line('SAP status', data.sap);
    }
    var refEl = document.getElementById('ref-num'); if (refEl) refEl.textContent = ref;
    document.getElementById('apply-success').classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function line(k, v) { return '<div class="s-line"><span class="k">' + k + '</span><span class="v">' + (v || '—') + '</span></div>'; }

  goTo(0);
})();
