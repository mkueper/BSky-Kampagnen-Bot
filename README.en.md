# Bluesky Campaign Bot

[![CI](https://github.com/mkueper/BSky-Kampagnen-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/mkueper/BSky-Kampagnen-Bot/actions/workflows/ci.yml)

The **Bluesky Campaign Bot** provides a reliable workflow for planning, scheduling, and publishing posts ("skeets") on Bluesky and additional platforms such as Mastodon. It includes an integrated dashboard, automated scheduler, live updates via SSE, and a set of tools designed for transparent, traceable, and efficient campaign communication.

The project is built on a Node.js/Express backend with SQLite as the primary database engine, a React-based dashboard, and a scheduler optimized for accuracy, resilience, and operational clarity.

> Note: This project supports responsible, evidence-based campaign communication.  
> The ethical guidelines are documented in [ETHICS.en.md](ETHICS.en.md) and [ETHICS.de.md](ETHICS.de.md).

> **Security & Stability Notice**
>
> This project is actively developed and continues to evolve. The dashboard and all production `/api/*` routes are protected by an admin login (`AUTH_*` variables, session cookies, `requireAuth` middleware). Deployments on publicly reachable servers require additional hardening (rate limiting, security headers, HTTPS via reverse proxy). Running the system without proper protection is **not recommended**.

---

## Key Features

* **Post Planning & Publishing** – Create, schedule, revise, and delete skeets; threads remain logically grouped.
* **Automated Scheduler** – Cron-based execution with retry strategies, backoff, and live reconfiguration from the dashboard.
* **Live Updates via SSE** – The dashboard receives real-time updates on published posts and refreshed engagement data.
* **Dashboard Configuration** – Adjust scheduler parameters (cron, timezone, retries) and fallback polling directly from the UI.
* **Engagement Collector** – Periodically retrieves likes, reposts, and replies for published threads (Bluesky, optionally Mastodon). On-demand refresh supported.
* **Reactions & Replies** – View likes, reposts, and replies directly within each skeet card.
* **Platform Selection & Crossposting** – Configure target platforms per skeet; Bluesky and Mastodon are preselected once Mastodon is enabled.
* **Frontend Tabs & UX Enhancements** – Manage scheduled and published posts, explore replies, export/import scheduled content.
* **Theme Switching** – Multiple dashboard themes (Light, Dim, Dark, Midnight) with persistent storage and automatic dark-mode support.
* **Integrated Bluesky Client** – Timeline view (Discover/Following) with composer and basic reply functionality.
* **Blocklist & Profile Indicators** – View blocked accounts; profiles show whether accounts block or are blocked.
* **Admin Login & API Protection** – All core features require authenticated sessions via secure httpOnly cookies.

The roadmap in `docs/ROADMAP.md` outlines future functionality (additional platforms, extended analytics, and more).

---

## Pending-Skeet Logic (Downtime Safety)

To avoid accidental bulk posting after outages or scheduler interruptions, overdue items are moved into a `pending_manual` state instead of being automatically sent.

* **Statuses**: `scheduled` (planned), `pending_manual` (missed, requires decision), `sent` (published), `skipped` (discarded). Optional: `draft`, `error`.
* **Why not auto-catch-up?** Large batches of outdated posts may be irrelevant or harmful. Manual review ensures editorial control.
* **Repeating Skeets**: Repeating entries also start in a pending state after downtime to avoid cascades of outdated repetitions.
* **Manual Options**: *Publish Once* sends the post immediately; *Discard* removes the overdue slot.
* **Test Coverage**: Automated tests verify all transitions and calculations in `backend/tests/backend/...`.

---

## Quick Start (Local Development)

```bash
# Clone repository
git clone https://github.com/mkueper/BSky-Kampagnen-Bot.git
cd BSky-Kampagnen-Bot

# Install backend dependencies
npm install

# Install and build dashboard
npm run install:frontend
npm run build:frontend

# Prepare environment
cp .env.sample .env
# Add BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD (and optional MASTODON_*)
# Configure admin login as needed

# Initialize schema
npm run migrate:dev

# Start development mode (auto reload)
npm run start:dev
```

* API: [http://localhost:3000](http://localhost:3000)
* Dashboard served via Express (`dashboard/dist`). Login is required if `AUTH_*` variables are set.

For production builds, use `npm run build:all` followed by `npm start`. See `docs/installation/local-install.md`.

---

## ThreadWriter Desktop (Tauri)

The Tauri-based desktop version of the ThreadWriter is available at:

[https://github.com/mkueper/ThreadWriter](https://github.com/mkueper/ThreadWriter)

---

## Docker Compose Deployment

The repository includes Compose files for backend and frontend. Example:

```bash
cp .env.sample .env
# Configure credentials and ports as needed

docker compose build
docker compose up -d
```

* Backend: `http://localhost:${BACKEND_PORT:-3000}`
* Frontend: `http://localhost:${FRONTEND_PORT:-8080}`
* SQLite databases stored in the `data` volume (`/app/data` in backend container)

After startup (and following updates), run:

```bash
docker compose exec backend npm run migrate:prod
```

Frontend configuration automatically proxies `/api/*` to the backend. More details in `docs/installation/docker-install.md`.

---

## Project Structure (Overview)

```
BSKy-Kampagnen-Bot/
├─ backend/server.js        # Express entrypoint + scheduler bootstrap
├─ backend/src/             # Backend logic (controllers, services, models)
├─ dashboard/               # React UI (Vite build in dashboard/dist)
├─ docker/                  # Dockerfiles + Nginx configuration
├─ docs/                    # Documentation
└─ data/                    # SQLite databases
```

Additional documentation:

* API Quick Reference: `docs/api.md`
* UI Guidelines & Components: `docs/ui.md`
* Frontend User Guide: `docs/frontend-user-guide.md`
* VS Code Workspace & Debugging: `docs/development/vscode-workspace.md`

Changelog maintenance is supported through:

* Quick entry: `npm run changelog:add -- "Short description"`
* Daily notes: `npm run changelog:note -- --section=UI "Change"`
* Release creation: `npm run changelog:release -- 1.2.3`

---

## Important Environment Variables (Excerpt)

| Variable                | Description                                  | Default               |
| ----------------------- | -------------------------------------------- | --------------------- |
| `BLUESKY_SERVER_URL`    | Bluesky endpoint                             | `https://bsky.social` |
| `BLUESKY_IDENTIFIER`    | Bot handle or account email                  | –                     |
| `BLUESKY_APP_PASSWORD`  | App password                                 | –                     |
| `MASTODON_API_URL`      | Mastodon instance (optional)                 | –                     |
| `MASTODON_ACCESS_TOKEN` | Mastodon access token                        | –                     |
| `TIME_ZONE`             | Scheduler timezone                           | `Europe/Berlin`       |
| `POST_RETRIES`          | Max retries                                  | `4`                   |
| `POST_BACKOFF_MS`       | Base backoff (ms)                            | `600`                 |
| `POST_BACKOFF_MAX_MS`   | Max backoff (ms)                             | `5000`                |
| `BACKEND_PORT`          | Backend port                                 | `3000`                |
| `FRONTEND_PORT`         | Nginx-served dashboard port                  | `8080`                |
| `UPLOAD_MAX_BYTES`      | Media upload limit                           | `8388608`             |
| `AUTH_USERNAME`         | Dashboard login username                     | –                     |
| `AUTH_PASSWORD_HASH`    | Salt:hash from `npm run tools:hash-password` | –                     |
| `AUTH_TOKEN_SECRET`     | Secret for sessions                          | –                     |

Full list in `.env.sample`.

---

## Dashboard Login Configuration

1. Set `AUTH_USERNAME` in `.env`.
2. Generate hash via `npm run tools:hash-password` → store as `AUTH_PASSWORD_HASH`.
3. Add a long random string as `AUTH_TOKEN_SECRET`.
4. Restart backend.

The dashboard uses httpOnly/SameSite=Lax cookies. All `/api/*` routes (except `/api/auth/*`) require authentication.

---

## Environment Profiles (dev/prod)

* `.env.dev` – Development/testing using low-risk accounts.
* `.env.prod` – Production bot/user account.

Switch active environment via:

```bash
npm run switchenv:dev
npm run switchenv:prod
```

Some changes may require rebuilding the dashboard.

---

## Configuration Principles (Env Priority)

* UI overrides (saved in DB) take highest priority.
* Server variables override `VITE_*`, which override defaults.
* `VITE_*` variables are embedded at build time.
* Runtime config is provided via `/api/client-config`.

Security note: Do not commit `.env`. Restrict permissions (e.g., `chmod 600 .env`).

---

## API (Advanced)

Primarily used by the dashboard and administrative automation. All require a valid session:

* `GET /api/client-config` – Client runtime configuration
* `GET/PUT /api/settings/scheduler` – Scheduler settings
* `GET/PUT /api/settings/client-polling` – Polling overrides
* `POST /api/skeets/:id/publish-now` – Immediate publish
* `POST /api/threads/:id/publish-now` – Immediate thread publish
* `POST /api/threads/:id/engagement/refresh` – Refresh thread engagement
* `GET /api/reactions/:skeetId` – Reaction details
* `GET /api/events` – Server-Sent Events
* `GET /api/bsky/timeline` – Timeline data
* `POST /api/tenor/download` – Server-side GIF download

---

## Tests & Quality Assurance

* **Manual testing**: `npm run start:dev` + dashboard build
* **Linting**: `npm run lint` / `npm run lint:fix`
* **Client tests**: `npm run test --workspace bsky-client`
* **Dashboard tests**: `npm run test --workspace dashboard`
* **Backend tests**: Root-level Vitest suite using in-memory SQLite
* **CI**: GitHub Actions run type checks, build frontend, lint, and test
* **Docker bundles**: `npm run docker:bundle` creates a deployable package

---

## Documentation & Contributing

See:

* `docs/README.md` – Documentation overview
* `docs/ROADMAP.md` – Planned development
* `docs/Agent.md` – Campaign Agent overview
* `docs/database.md` – Database schema and migration notes
* `docs/diagramme/*` – Architecture diagrams

Contributions, issues, and ideas are welcome.

### Contributor Guidelines

* Use shared UI components (`Button`, `Card`, `Badge`) for consistency
* Run `npm test` and `npm run lint` before commits
* Follow the changelog workflow (daily notes → release summaries)
* Use `.env.dev` for development, never production credentials in testing

---

## Ethical Use & Project Intent

*(Summary — see [ETHICS.en.md](ETHICS.en.md) or [ETHICS.de.md](ETHICS.de.md) for the full policy)*

This project aims to support responsible and transparent digital communication. It is intended for users who value evidence-based messaging, clarity, and media literacy. We ask contributors and users to refrain from using this tool for manipulative automation, artificial amplification, or the spread of disinformation.

The ethical guidelines are **not legal restrictions** but a statement of values and expectations for responsible use.

---

## License

This project is licensed under the **GNU General Public License v3.0**. See [LICENSE](./LICENSE) for details.
