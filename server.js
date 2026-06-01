/*
 * United Services Recruiting — web server
 * Serves the static marketing site (public/) and exposes a small JSON API
 * for the driver application and company partner forms. Designed to run as-is
 * on Railway (binds to process.env.PORT, exposes a /healthz check).
 */
'use strict';

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// In-memory submission store. Swap for a real datastore (Railway Postgres,
// etc.) when the backend is wired up — the API shape stays the same.
const submissions = { applications: [], partners: [] };

function reference(prefix) {
  return prefix + '-' + Math.floor(100000 + Math.random() * 899999);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---- Driver application ----
app.post('/api/apply', (req, res) => {
  const b = req.body || {};
  const errors = [];
  if (!b.name || !String(b.name).trim()) errors.push('name');
  if (!b.email || !EMAIL_RE.test(String(b.email))) errors.push('email');
  if (!b.phone || String(b.phone).replace(/\D/g, '').length < 10) errors.push('phone');
  if (errors.length) return res.status(400).json({ ok: false, errors });

  const ref = reference('USR');
  submissions.applications.push({ ref, at: new Date().toISOString(), data: b });
  res.json({ ok: true, ref });
});

// ---- Company partner request ----
app.post('/api/partner', (req, res) => {
  const b = req.body || {};
  const errors = [];
  if (!b.company || !String(b.company).trim()) errors.push('company');
  if (!b.name || !String(b.name).trim()) errors.push('name');
  if (!b.email || !EMAIL_RE.test(String(b.email))) errors.push('email');
  if (errors.length) return res.status(400).json({ ok: false, errors });

  const ref = reference('USP');
  submissions.partners.push({ ref, at: new Date().toISOString(), data: b });
  res.json({ ok: true, ref });
});

// ---- Health check (Railway) ----
app.get('/healthz', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ---- Static site ----
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// Friendly 404 -> home
app.use((_req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`United Services Recruiting running on http://localhost:${PORT}`);
});
