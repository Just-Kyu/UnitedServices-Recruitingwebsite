/* United Services — admin portal logic
 *
 * Auth: Supabase Auth. The username field maps to an email (admin ->
 * admin@unitedservices.app) so you can sign in with the simple credentials
 * from ADMIN-SETUP.md. Only the authenticated admin can write; the public
 * site (anon key) can only read published rows — enforced by RLS, so this
 * portal is genuinely gated, not just hidden.
 */
(function () {
  'use strict';
  var sb = window.usrSupabase;
  var LOGIN = document.getElementById('login-screen');
  var DASH = document.getElementById('dash');
  var ADMIN_DOMAIN = 'unitedservices.app';

  if (!sb) {
    document.getElementById('login-err').textContent =
      'Supabase is not configured (js/config.js). Cannot sign in.';
    return;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toEmail(u) { u = (u || '').trim(); return u.indexOf('@') !== -1 ? u : u + '@' + ADMIN_DOMAIN; }

  /* ---------- auth ---------- */
  function showDash(show) {
    LOGIN.hidden = show; DASH.hidden = !show;
    if (show) { loadOffers(); loadDrivers(); loadLeads(); }
  }
  sb.auth.getSession().then(function (r) { showDash(!!(r.data && r.data.session)); });

  var loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('login-btn');
    var err = document.getElementById('login-err');
    err.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
    sb.auth.signInWithPassword({
      email: toEmail(document.getElementById('admin-user').value),
      password: document.getElementById('admin-pass').value
    }).then(function (res) {
      btn.disabled = false; btn.textContent = 'Sign in';
      if (res.error) { err.textContent = res.error.message || 'Sign-in failed.'; return; }
      showDash(true);
    });
  });
  document.getElementById('logout-btn').addEventListener('click', function () {
    sb.auth.signOut().then(function () { showDash(false); });
  });

  /* ---------- tabs ---------- */
  document.querySelectorAll('.atab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.atab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      var name = t.getAttribute('data-tab');
      document.querySelectorAll('.atab-panel').forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== name;
      });
    });
  });

  /* ---------- offers ---------- */
  function loadOffers() {
    sb.from('offers').select('*').order('created_at', { ascending: false }).then(function (res) {
      var list = document.getElementById('offer-list');
      if (res.error) { list.innerHTML = '<div class="admin-empty">' + esc(res.error.message) + '</div>'; return; }
      var rows = res.data || [];
      document.getElementById('cnt-offers').textContent = rows.length;
      if (!rows.length) { list.innerHTML = '<div class="admin-empty">No offers yet. Add one on the left.</div>'; return; }
      list.innerHTML = rows.map(function (o) {
        var tags = (o.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
        var sub = [o.location, o.route, o.equipment, o.pay].filter(Boolean).map(esc).join(' · ');
        return '<div class="admin-row' + (o.is_published ? '' : ' is-hidden') + '">' +
          '<div class="ar-main"><div class="ar-title">' + esc(o.company) + '</div>' +
          '<div class="ar-sub">' + sub + '</div><div class="ar-tags">' + tags + '</div></div>' +
          '<div class="ar-actions">' +
          '<button class="ar-btn ' + (o.is_published ? 'pub' : 'hidden') + '" data-pub="offers" data-id="' + o.id + '" data-val="' + (o.is_published ? 'false' : 'true') + '">' + (o.is_published ? 'Live' : 'Draft') + '</button>' +
          '<button class="ar-btn del" data-del="offers" data-id="' + o.id + '">Delete</button>' +
          '</div></div>';
      }).join('');
    });
  }
  document.getElementById('offer-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = document.getElementById('offer-msg');
    var row = {
      company: f.company.value.trim(),
      location: f.location.value.trim() || null,
      route: f.route.value || null,
      equipment: f.equipment.value || null,
      pay: f.pay.value.trim() || null,
      tags: f.tags.value.trim() ? f.tags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : null,
      badge: f.badge.value.trim() || null,
      notes: f.notes.value.trim() || null,
      is_published: f.is_published.value === 'true'
    };
    if (!row.company) return;
    sb.from('offers').insert(row).then(function (res) {
      if (res.error) { msg.className = 'form-msg err'; msg.textContent = res.error.message; return; }
      msg.className = 'form-msg ok'; msg.textContent = 'Offer added.';
      f.reset(); f.badge.value = 'Hiring now';
      setTimeout(function () { msg.textContent = ''; }, 2500);
      loadOffers();
    });
  });

  /* ---------- drivers ---------- */
  function loadDrivers() {
    sb.from('drivers').select('*').order('created_at', { ascending: false }).then(function (res) {
      var list = document.getElementById('driver-list');
      if (res.error) { list.innerHTML = '<div class="admin-empty">' + esc(res.error.message) + '</div>'; return; }
      var rows = res.data || [];
      document.getElementById('cnt-drivers').textContent = rows.length;
      if (!rows.length) { list.innerHTML = '<div class="admin-empty">No drivers yet. Add one on the left.</div>'; return; }
      list.innerHTML = rows.map(function (d) {
        var sub = [d.location, d.cdl_class, d.years, d.route].filter(Boolean).map(esc).join(' · ');
        var tags = [d.equipment, d.clearance].filter(Boolean).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
        return '<div class="admin-row' + (d.is_published ? '' : ' is-hidden') + '">' +
          '<div class="ar-main"><div class="ar-title">' + esc(d.handle || 'Driver') + '</div>' +
          '<div class="ar-sub">' + sub + '</div><div class="ar-tags">' + tags + '</div></div>' +
          '<div class="ar-actions">' +
          '<button class="ar-btn ' + (d.is_published ? 'pub' : 'hidden') + '" data-pub="drivers" data-id="' + d.id + '" data-val="' + (d.is_published ? 'false' : 'true') + '">' + (d.is_published ? 'Live' : 'Draft') + '</button>' +
          '<button class="ar-btn del" data-del="drivers" data-id="' + d.id + '">Delete</button>' +
          '</div></div>';
      }).join('');
    });
  }
  document.getElementById('driver-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = document.getElementById('driver-msg');
    var row = {
      handle: f.handle.value.trim() || null,
      location: f.location.value.trim() || null,
      cdl_class: f.cdl_class.value,
      years: f.years.value.trim() || null,
      exp_level: f.exp_level.value,
      equipment: f.equipment.value || null,
      route: f.route.value || null,
      clearance: f.clearance.value,
      is_published: f.is_published.value === 'true'
    };
    sb.from('drivers').insert(row).then(function (res) {
      if (res.error) { msg.className = 'form-msg err'; msg.textContent = res.error.message; return; }
      msg.className = 'form-msg ok'; msg.textContent = 'Driver added.';
      f.reset();
      setTimeout(function () { msg.textContent = ''; }, 2500);
      loadDrivers();
    });
  });

  /* ---------- publish toggle + delete (event delegation) ---------- */
  document.addEventListener('click', function (e) {
    var pub = e.target.closest('[data-pub]');
    if (pub) {
      var tbl = pub.getAttribute('data-pub');
      sb.from(tbl).update({ is_published: pub.getAttribute('data-val') === 'true' })
        .eq('id', pub.getAttribute('data-id'))
        .then(function () { tbl === 'offers' ? loadOffers() : loadDrivers(); });
      return;
    }
    var del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm('Delete this listing permanently?')) return;
      var t = del.getAttribute('data-del');
      sb.from(t).delete().eq('id', del.getAttribute('data-id'))
        .then(function () { t === 'offers' ? loadOffers() : loadDrivers(); });
    }
  });

  /* ---------- inbound leads (read-only) ---------- */
  function loadLeads() {
    sb.from('driver_leads').select('*').order('created_at', { ascending: false }).limit(200).then(function (res) {
      var tb = document.querySelector('#driver-leads-tbl tbody');
      var rows = (res.data || []);
      if (res.error) { tb.innerHTML = '<tr><td>' + esc(res.error.message) + '</td></tr>'; return; }
      tb.innerHTML = rows.length ? rows.map(function (l) {
        var eq = Array.isArray(l.equipment) ? l.equipment.join(', ') : (l.equipment || '');
        return '<tr><td class="lt-name">' + esc(l.name || '—') + '<div class="lt-meta">' + esc(l.cdl_class || '') + ' · ' + esc(l.years || '') + '</div></td>' +
          '<td class="lt-contact">' + esc(l.phone || '') + '<br>' + esc(l.email || '') + '</td>' +
          '<td class="lt-meta">' + esc([eq, l.route, l.sap_status, l.location].filter(Boolean).join(' · ')) + '</td></tr>';
      }).join('') : '<tr><td class="lt-meta">No driver applications yet.</td></tr>';
    });
    sb.from('company_leads').select('*').order('created_at', { ascending: false }).limit(200).then(function (res) {
      var tb = document.querySelector('#company-leads-tbl tbody');
      var rows = (res.data || []);
      if (res.error) { tb.innerHTML = '<tr><td>' + esc(res.error.message) + '</td></tr>'; return; }
      document.getElementById('cnt-leads').textContent = rows.length;
      tb.innerHTML = rows.length ? rows.map(function (l) {
        return '<tr><td class="lt-name">' + esc(l.company || '—') + '<div class="lt-meta">' + esc(l.name || '') + '</div></td>' +
          '<td class="lt-contact">' + esc(l.phone || '') + '<br>' + esc(l.email || '') + '</td>' +
          '<td class="lt-meta">' + esc([l.equipment, l.hire_count, l.notes].filter(Boolean).join(' · ')) + '</td></tr>';
      }).join('') : '<tr><td class="lt-meta">No carrier requests yet.</td></tr>';
    });
  }
})();
