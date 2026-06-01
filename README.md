# United Services Recruiting

A driver–carrier matching website for **United Services Recruiting**: a cinematic
"For Drivers" home page with a live job matcher, a "For Companies" drivers board,
and a multi-step driver application. Built from the Claude Design handoff
(see `chats/` for the original design conversation and `project/` for the
exported design artifacts).

## Stack

- **Frontend:** static HTML/CSS/JS in `public/` (no build step). Three.js (CDN)
  powers the hero wireframe truck; everything else is hand-rolled CSS/JS.
- **Backend:** a small Express server (`server.js`) that serves `public/` and
  exposes a JSON API for the application and partner forms.

## Project layout

```
server.js          Express server (static site + API)
package.json       start script + deps
railway.json       Railway deploy config (health check at /healthz)
Procfile           start command for Railway/Heroku-style platforms
public/            the website (web root)
  index.html         Home — For Drivers (hero, matcher, equipment, offers)
  for-companies.html For Companies — drivers board + partner form
  apply.html         Multi-step driver application
  *.css, js/, assets/
project/           original design export artifacts (screenshots, uploads)
chats/             original design conversation transcripts
```

## Run locally

```bash
npm install
npm start
# → http://localhost:3000
```

The server listens on `process.env.PORT` (defaults to `3000`).

## API

| Method | Path           | Body                                            | Response                          |
|--------|----------------|-------------------------------------------------|-----------------------------------|
| POST   | `/api/apply`   | `{ name, email, phone, ... }`                   | `{ ok, ref }` or `{ ok:false, errors }` |
| POST   | `/api/partner` | `{ company, name, email, ... }`                 | `{ ok, ref }` or `{ ok:false, errors }` |
| GET    | `/healthz`     | —                                               | `{ ok, uptime }`                  |

Submissions are currently held in memory. Swap the in-memory store in
`server.js` for a real datastore (e.g. Railway Postgres) when wiring up the
backend — the request/response shape stays the same. The forms degrade
gracefully: if the API is unavailable, they still confirm with a local
reference number.

## Deploy to Railway

1. Push this repo to GitHub.
2. In Railway, create a new project → **Deploy from GitHub repo** and select it.
3. Railway auto-detects Node via `package.json`/`railway.json`, runs
   `npm install` then `npm start`, and health-checks `/healthz`. No env vars
   are required to boot.
