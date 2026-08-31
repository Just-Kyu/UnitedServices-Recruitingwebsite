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
  // Domain appended when the username field has no '@'. Keep this on a domain
  // you actually control: password-recovery mail goes to this address, so
  // whoever owns the domain can take over the admin account.
  // Typing a full email address in the login field bypasses this entirely.
  var ADMIN_DOMAIN = 'us-unitedservices.com';

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


  /* ---------- carrier logo ---------- */
  // Stored as a data URL on the offer row: no storage bucket to provision, and
  // a logo downscaled to 256px is a few KB. Colour is kept as uploaded; the
  // public site renders every logo black-and-white via CSS.
  var offerLogo = null;
  (function () {
    var input = document.getElementById('offer-logo');
    var prev = document.getElementById('offer-logo-prev');
    var clear = document.getElementById('offer-logo-clear');
    if (!input) return;
    function reset() {
      offerLogo = null; input.value = '';
      prev.hidden = true; clear.hidden = true;
    }
    clear.addEventListener('click', reset);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return reset();
      if (file.size > 4 * 1024 * 1024) { alert('Logo is over 4 MB — please use a smaller file.'); return reset(); }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 256, w = img.width, h = img.height;
          var scale = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          offerLogo = c.toDataURL('image/png');
          prev.querySelector('img').src = offerLogo;
          prev.hidden = false; clear.hidden = false;
        };
        // SVG has no intrinsic raster size in some browsers — keep it as-is.
        if (file.type === 'image/svg+xml') {
          offerLogo = reader.result;
          prev.querySelector('img').src = offerLogo;
          prev.hidden = false; clear.hidden = false;
          return;
        }
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    window.__resetOfferLogo = reset;
  })();

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
        var sub = [o.location, o.route, o.equipment, o.pay, o.home_time].filter(Boolean).map(esc).join(' · ');
        var thumb = o.logo_url ? '<span class="ar-logo"><img src="' + esc(o.logo_url) + '" alt=""></span>' : '';
        return '<div class="admin-row' + (o.is_published ? '' : ' is-hidden') + '">' +
          '<div class="ar-main"><div class="ar-title">' + thumb + esc(o.company) + '</div>' +
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
      logo_url: offerLogo || null,
      home_time: f.home_time.value.trim() || null,
      escrow: f.escrow.value.trim() || null,
      sign_on: f.sign_on.value.trim() || null,
      insurance: f.insurance.value.trim() || null,
      rpm: f.rpm.value ? parseFloat(f.rpm.value) : null,
      avg_miles: f.avg_miles.value ? parseInt(f.avg_miles.value, 10) : null,
      is_published: f.is_published.value === 'true'
    };
    if (!row.company) return;
    sb.from('offers').insert(row).then(function (res) {
      if (res.error) { msg.className = 'form-msg err'; msg.textContent = res.error.message; return; }
      msg.className = 'form-msg ok'; msg.textContent = 'Offer added.';
      f.reset(); f.badge.value = 'Hiring now';
      if (window.__resetOfferLogo) window.__resetOfferLogo();
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
        var sub = [d.handle, d.location, d.cdl_class, d.years, d.route].filter(Boolean).map(esc).join(' · ');
        var tags = [d.equipment, d.clearance].filter(Boolean).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
        return '<div class="admin-row' + (d.is_published ? '' : ' is-hidden') + '">' +
          '<div class="ar-main"><div class="ar-title">' + esc(d.name || d.handle || 'Driver') + '</div>' +
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
      name: f.name.value.trim() || null,
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
      var t = del.getAttribute('data-del');
      var isLead = t === 'driver_leads' || t === 'company_leads';
      if (!confirm(isLead
            ? 'Delete this enquiry permanently? Their details will be gone.'
            : 'Delete this listing permanently?')) return;
      sb.from(t).delete().eq('id', del.getAttribute('data-id'))
        .then(function () {
          if (isLead) loadLeads();
          else if (t === 'offers') loadOffers();
          else loadDrivers();
        });
    }
  });

  /* ---------- inbound leads ----------------------------------------------
   * A lead list is a work queue, not a report. Everything here exists so the
   * next action is one click away: who and when at the top, phone and email
   * as real tel:/mailto: links with copy buttons, every answer on its own
   * labelled line, and search / date / status filters so a list of 200 stays
   * workable. Status needs the column from supabase/leads-extras.sql; without
   * it the control is hidden and the rest still works.
   */
  var LEADS = { driver: [], company: [] };
  var leadState = { kind: 'driver', q: '', days: 0, status: '', sort: 'new' };
  var statusOk = { driver: false, company: false };

  var STATUSES = [
    { v: 'new',       t: 'New' },
    { v: 'contacted', t: 'Contacted' },
    { v: 'placed',    t: 'Placed' },
    { v: 'closed',    t: 'Closed' }
  ];

  function when(iso) {
    if (!iso) return { rel: '—', abs: '' };
    var d = new Date(iso), mins = Math.round((Date.now() - d.getTime()) / 60000);
    var rel;
    if (mins < 1) rel = 'just now';
    else if (mins < 60) rel = mins + ' min ago';
    else if (mins < 1440) rel = Math.round(mins / 60) + ' h ago';
    else if (mins < 43200) rel = Math.round(mins / 1440) + ' d ago';
    else rel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return { rel: rel, abs: d.toLocaleString(), ms: d.getTime() };
  }
  function isNew(iso) { return iso && (Date.now() - new Date(iso).getTime()) < 48 * 3600 * 1000; }
  function digits(s) { return String(s || '').replace(/[^\d+]/g, ''); }
  function listify(v) { return Array.isArray(v) ? v : (v ? String(v).split(/,\s*/) : []); }

  var ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>'
  };

  function contactRow(phone, email) {
    var out = '';
    if (phone) {
      out += '<span class="lc-pair"><a class="lc" href="tel:' + esc(digits(phone)) + '">' + ICON.phone + esc(phone) + '</a>' +
             '<button type="button" class="lc-copy" data-copy="' + esc(phone) + '">Copy</button></span>';
    }
    if (email) {
      out += '<span class="lc-pair"><a class="lc" href="mailto:' + esc(email) + '">' + ICON.mail + esc(email) + '</a>' +
             '<button type="button" class="lc-copy" data-copy="' + esc(email) + '">Copy</button></span>';
    }
    return out ? '<div class="lead-contact">' + out + '</div>' : '';
  }
  function fact(label, value) {
    return value ? '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>' : '';
  }
  function chips(arr) {
    return arr.length ? '<div class="lead-chips">' + arr.map(function (t) {
      return '<span>' + esc(t) + '</span>';
    }).join('') + '</div>' : '';
  }
  function notesBlock(label, text) {
    return text ? '<p class="lead-notes"><b>' + esc(label) + '</b>' + esc(text) + '</p>' : '';
  }
  function statusSelect(kind, l) {
    if (!statusOk[kind]) return '';
    var cur = l.status || 'new';
    return '<select class="lead-status" data-status="' + (kind === 'driver' ? 'driver_leads' : 'company_leads') +
      '" data-id="' + esc(l.id) + '" aria-label="Lead status">' +
      STATUSES.map(function (s) {
        return '<option value="' + s.v + '"' + (s.v === cur ? ' selected' : '') + '>' + s.t + '</option>';
      }).join('') + '</select>';
  }

  /* A second application from the same phone or email is a follow-up, not a
     new person — worth flagging so nobody gets called twice. */
  function markRepeats(rows) {
    var seen = {};
    rows.slice().sort(function (a, b) {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }).forEach(function (r) {
      var keys = [digits(r.phone), String(r.email || '').toLowerCase()].filter(Boolean);
      r.__repeat = keys.some(function (k) { return seen[k]; });
      keys.forEach(function (k) { seen[k] = true; });
    });
  }

  function renderDriver(l) {
    var t = when(l.created_at);
    return '<article class="lead' + (l.status === 'closed' || l.status === 'placed' ? ' is-done' : '') + '">' +
      '<div class="lead-top"><div class="lead-who"><h3>' + esc(l.name || 'Unnamed') + '</h3>' +
        (isNew(l.created_at) ? '<span class="pill new">New</span>' : '') +
        (l.__repeat ? '<span class="pill dup">Repeat</span>' : '') +
      '</div><time class="lead-when" title="' + esc(t.abs) + '">' + esc(t.rel) + '</time></div>' +
      contactRow(l.phone, l.email) +
      '<dl class="lead-facts">' +
        fact('CDL class', l.cdl_class) +
        fact('Experience', l.years) +
        fact('Route', l.route) +
        fact('Weekly miles', l.weekly_miles) +
        fact('SAP status', l.sap_status) +
        fact('Location', l.location) +
      '</dl>' +
      chips(listify(l.equipment)) +
      notesBlock('Notes', l.notes) +
      '<div class="lead-foot">' + statusSelect('driver', l) +
        '<button class="ar-btn del" data-del="driver_leads" data-id="' + esc(l.id) + '">Delete</button>' +
        '<span class="lead-ref">' + esc(l.ref || '') + '</span>' +
      '</div></article>';
  }

  function renderCompany(l) {
    var t = when(l.created_at);
    return '<article class="lead' + (l.status === 'closed' || l.status === 'placed' ? ' is-done' : '') + '">' +
      '<div class="lead-top"><div class="lead-who"><h3>' + esc(l.company || 'Unnamed carrier') + '</h3>' +
        (isNew(l.created_at) ? '<span class="pill new">New</span>' : '') +
        (l.__repeat ? '<span class="pill dup">Repeat</span>' : '') +
      '</div><time class="lead-when" title="' + esc(t.abs) + '">' + esc(t.rel) + '</time></div>' +
      contactRow(l.phone, l.email) +
      '<dl class="lead-facts">' +
        fact('Contact', l.name) +
        fact('Equipment', l.equipment) +
        fact('Drivers needed', l.hire_count) +
      '</dl>' +
      notesBlock('Notes', l.notes) +
      '<div class="lead-foot">' + statusSelect('company', l) +
        '<button class="ar-btn del" data-del="company_leads" data-id="' + esc(l.id) + '">Delete</button>' +
        '<span class="lead-ref">' + esc(l.ref || '') + '</span>' +
      '</div></article>';
  }

  function visibleLeads() {
    var rows = LEADS[leadState.kind] || [];
    var q = leadState.q.trim().toLowerCase();
    var cutoff = leadState.days ? Date.now() - leadState.days * 86400000 : 0;
    var out = rows.filter(function (l) {
      if (cutoff && new Date(l.created_at || 0).getTime() < cutoff) return false;
      if (leadState.status && (l.status || 'new') !== leadState.status) return false;
      if (!q) return true;
      var hay = [l.name, l.company, l.phone, l.email, l.location, l.route, l.sap_status,
                 l.cdl_class, l.years, l.weekly_miles, l.hire_count, l.notes, l.ref,
                 listify(l.equipment).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    out.sort(function (a, b) {
      if (leadState.sort === 'name') {
        return String(a.name || a.company || '').localeCompare(String(b.name || b.company || ''));
      }
      var d = new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return leadState.sort === 'old' ? d : -d;
    });
    return out;
  }

  function renderLeads() {
    var box = document.getElementById('lead-list');
    if (!box) return;
    var kind = leadState.kind;
    var rows = visibleLeads();
    var total = (LEADS[kind] || []).length;

    document.getElementById('leads-count').textContent =
      total ? (rows.length === total ? total + ' total' : rows.length + ' of ' + total) : '';
    document.getElementById('leads-status').hidden = !statusOk[kind];

    if (!rows.length) {
      box.innerHTML = '<div class="admin-empty">' + (total
        ? 'No leads match those filters.'
        : (kind === 'driver' ? 'No driver applications yet.' : 'No carrier requests yet.')) + '</div>';
      return;
    }
    var hint = statusOk[kind] ? '' :
      '<div class="lead-hint">Want to track follow-ups? Run <code>supabase/leads-extras.sql</code> once in the ' +
      'Supabase SQL editor and a status control appears on every lead.</div>';
    box.innerHTML = hint + rows.map(kind === 'driver' ? renderDriver : renderCompany).join('');
  }

  function fetchLeads(table, key, countEl) {
    return sb.from(table).select('*').order('created_at', { ascending: false }).limit(500)
      .then(function (res) {
        if (res.error) {
          LEADS[key] = [];
          if (leadState.kind === key) {
            document.getElementById('lead-list').innerHTML =
              '<div class="admin-empty">' + esc(res.error.message) + '</div>';
          }
          return;
        }
        var rows = res.data || [];
        statusOk[key] = !!rows.length && Object.prototype.hasOwnProperty.call(rows[0], 'status');
        markRepeats(rows);
        LEADS[key] = rows;
        document.getElementById(countEl).textContent = rows.length;
      });
  }

  function loadLeads() {
    Promise.all([
      fetchLeads('driver_leads', 'driver', 'cnt-dl'),
      fetchLeads('company_leads', 'company', 'cnt-cl')
    ]).then(function () {
      // The tab badge counts every inbound lead, both kinds.
      document.getElementById('cnt-leads').textContent =
        LEADS.driver.length + LEADS.company.length;
      renderLeads();
    });
  }

  /* ---------- leads: controls ---------- */
  (function () {
    var q = document.getElementById('leads-q');
    if (!q) return;
    var timer;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { leadState.q = q.value; renderLeads(); }, 120);
    });
    document.getElementById('leads-when').addEventListener('change', function () {
      leadState.days = parseInt(this.value, 10) || 0; renderLeads();
    });
    document.getElementById('leads-status').addEventListener('change', function () {
      leadState.status = this.value; renderLeads();
    });
    document.getElementById('leads-sort').addEventListener('change', function () {
      leadState.sort = this.value; renderLeads();
    });
    document.querySelectorAll('.lsw').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.lsw').forEach(function (x) {
          x.classList.remove('active'); x.setAttribute('aria-selected', 'false');
        });
        b.classList.add('active'); b.setAttribute('aria-selected', 'true');
        leadState.kind = b.getAttribute('data-leads');
        renderLeads();
      });
    });

    // Copy: one tap to get a number into the dialler or a paste buffer.
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.lc-copy');
      if (!btn) return;
      var text = btn.getAttribute('data-copy') || '';
      var done = function () {
        var was = btn.textContent;
        btn.textContent = 'Copied'; btn.classList.add('done');
        setTimeout(function () { btn.textContent = was; btn.classList.remove('done'); }, 1400);
      };
      // execCommand is the fallback for the clipboard API being blocked or
      // absent — without it the button gives no feedback at all.
      var legacy = function () {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, legacy);
        return;
      }
      legacy();
    });

    // Status writes straight through; the local row is updated so the card
    // re-renders without a round trip to the server.
    document.addEventListener('change', function (e) {
      var sel = e.target.closest('.lead-status');
      if (!sel) return;
      var table = sel.getAttribute('data-status');
      var id = sel.getAttribute('data-id');
      var key = table === 'driver_leads' ? 'driver' : 'company';
      var value = sel.value;
      sel.disabled = true;
      sb.from(table).update({ status: value }).eq('id', id).then(function (res) {
        sel.disabled = false;
        if (res.error) { alert('Could not save the status: ' + res.error.message); return; }
        LEADS[key].forEach(function (l) { if (String(l.id) === String(id)) l.status = value; });
        renderLeads();
      });
    });

    document.getElementById('leads-export').addEventListener('click', function () {
      var rows = visibleLeads();
      if (!rows.length) { alert('Nothing to export with the current filters.'); return; }
      var cols = leadState.kind === 'driver'
        ? ['created_at', 'ref', 'name', 'phone', 'email', 'cdl_class', 'years', 'equipment', 'route', 'weekly_miles', 'sap_status', 'location', 'notes', 'status']
        : ['created_at', 'ref', 'company', 'name', 'phone', 'email', 'equipment', 'hire_count', 'notes', 'status'];
      var cell = function (v) {
        if (v == null) return '';
        var s = Array.isArray(v) ? v.join(', ') : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      var csv = cols.join(',') + '\n' +
        rows.map(function (r) { return cols.map(function (c) { return cell(r[c]); }).join(','); }).join('\n');
      var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'united-services-' + leadState.kind + '-leads-' +
        new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  })();
})();
