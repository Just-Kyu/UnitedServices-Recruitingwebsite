# United Services Recruiting

A driver–carrier matching website for **United Services Recruiting**: a cinematic
"For Drivers" home page with a live job matcher, a "For Companies" drivers board,
and a multi-step driver application. Built from the Claude Design handoff
(see `chats/` for the original design conversation and `project/` for the
exported design artifacts).

## Stack

- **Frontend:** static HTML/CSS/JS in `public/` (no build step). Three.js
  (CDN) drives the hero — a Tesla Semi GLB rendered with a procedural
  environment map, auto-rotation, and mouse parallax. Everything else is
  hand-rolled CSS/JS.
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

## Binary assets (add locally before serving)

These files are referenced by the site but are not stored in the repo (they
have to be dropped in by hand):

```
public/assets/logo-mark.png      navbar + footer mark
public/assets/logo-full.png      OG image / hero references
public/assets/logo-chrome.png    chrome variant
public/models/tesla-semi.glb     Tesla Semi model used by the hero
```

The hero loads `public/models/tesla-semi.glb`. Use the optimized 348 KB
variant by default; if it fails to load (e.g. the meshopt decoder isn't
present), rename the larger uncompressed `tesla-semi-web.glb` to
`tesla-semi.glb` instead.

## Credits

The hero 3D model is **"Tesla Semi"** by
[Aleksei Rozumnyi](https://sketchfab.com/Aleksei.Rozumnyi),
licensed under [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) —
[original on Sketchfab](https://sketchfab.com/3d-models/tesla-semi-39ffc7c746184e0c9ebd5bbcd0b405dd).
