# BSky Kampagnen Bot – v1.1.0

Release-Date: 2025-10-13

## Security
- Remove `mastodon-api`; implement fetch‑based Mastodon client
- `npm audit` clean (0 vulnerabilities)

## Backend
- Scheduling: interpret `datetime-local` as local time; fix +2h drift
- Robust server parsing and validation for `scheduledAt`

## Realtime
- Add SSE endpoint (`/api/events`)
- UI subscribes to publish and engagement events
- Polling pauses when SSE is connected

## UI
- Credentials: saving navigates immediately to Overview (no jump back)
- Polling fallback intervals increased: active 30s, idle 2m, hidden 5m

## Electron
- Hide menubar; block reload/devtools in production
- Open external links in system browser
- Remember window size/position; default 1240×980

## DX / Robustness
- Baseline migration more defensive for SQLite (ignore `changeColumn` failures)
- Auto‑create SQLite storage directory
- Disable caching for `index.html`
- Update `.env.sample` and README

## Artifact
- AppImage: `dist/BSky Kampagnen Bot-1.1.0.AppImage`
- SHA256: `49997de214973ca694958659f0ec3bf980354c746f55430c6254e1698357359c`

