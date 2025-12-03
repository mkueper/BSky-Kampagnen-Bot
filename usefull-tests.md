# Vorschläge für zusätzliche, sinnvolle Tests

Stand: Alle aktuellen Vitest-Suites laufen grün (`npm test`).

Die folgenden Bereiche wirken fachlich/technisch kritisch, haben aber entweder keine oder nur indirekte Tests. Zusätzliche Tests würden die Stabilität des Projekts deutlich verbessern.

---

## Backend

### 1. Authentifizierung und Autorisierung
- Dateien:  
  - `backend/src/api/middleware/requireAuth.js`  
  - `backend/src/api/routes/authRoutes.js`  
- Aktuelle Situation:  
  - Es existieren viele API-Tests (z.B. `credentialsApi`, `clientConfig`, `pending-skeets`), aber keine gezielten Tests für Auth-Middleware und Auth-Routen.
- Sinnvolle Tests:  
  - Unit-Tests für `requireAuth`:
    - Blockiert Requests ohne Session/JWT (401/403).  
    - Lässt gültige Sessions durch und setzt erwartete User-Infos ins `req`-Objekt.  
    - Verhalten bei abgelaufenen/invaliden Tokens.  
  - API-Tests für Login/Logout/Session-Status (happy path + Fehlerfälle), inkl. Rate-Limiting/Lockout, falls vorhanden.

### 2. Konfigurationswechsel / Umgebungen
- Dateien:  
  - `scripts/switch-env.js`  
  - `backend/src/env.js`, `backend/src/config.js`  
- Aktuelle Situation:  
  - `configDefaults` ist getestet, aber das Zusammenspiel von ENV-Variablen, `.env` und Runtime-Konfiguration nicht vollständig.
- Sinnvolle Tests:  
  - Unit-Tests für `switch-env.js` (mit temporären Verzeichnissen / Mocks):
    - Korrekte Auswahl/Erstellung von Konfigurationsdateien pro Umgebung (`dev`, `test`, `prod`).  
    - Idempotenz: mehrfaches Ausführen führt nicht zu inkonsistenten Zuständen.  
  - Tests für `env/config`:
    - Pflicht-ENV-Variablen (z.B. DB-Pfade, Secrets) – klare Fehler, wenn sie fehlen.  
    - Überschreiben von Defaults durch ENV-Variablen.

### 3. Datenbank-Migrationen und Seeds (Smoke-Tests)
- Dateien/Ordner:  
  - `migrations/`, `backend/src/data`, `scripts/db-reset.js`  
- Aktuelle Situation:  
  - Es gibt Tests für einzelne Services (z.B. pending skeets, profiles), aber keine automatisierten „Migrations laufen durch“-Checks.
- Sinnvolle Tests (z.B. unter `z-tests/` oder als opt-in-Tests):  
  - Script-basierte Vitest- oder Node-Tests, die in einer separaten SQLite-DB:  
    - `sequelize db:migrate` ausführen.  
    - Optional `db:reset:test` und einen einfachen Smoke-Query gegen ein Kernmodell ausführen.  
  - Ziel ist nicht Business-Logik, sondern frühes Erkennen von kaputten Migrationen.

### 4. Scheduler-/Cron-Konfiguration
- Dateien:  
  - `backend/src/scheduler/*`, `backend/src/core/*`, Cron-Setup in `backend/server.js` oder entsprechenden Modulen.  
- Aktuelle Situation:  
  - Es gibt Tests für einzelne Scheduler-Helfer (`schedulerHelpers`, `startupPendingScan`), aber keine Tests, die den „Verkabelungsweg“ (Cron -> Job -> Service) abdecken.
- Sinnvolle Tests:  
  - Integrationstest, der:
    - Den Scheduler mit Fake-Timern (`vi.useFakeTimers()`) startet.  
    - Eine simulierte Zeit-Advance ausführt und erwartet, dass bestimmte Services aufgerufen werden (z.B. Pending-Skeets-Scan, PostSendLogs).

---

## bsky-client (Frontend)

### 5. Globale App-Reducer / State-Maschine
- Dateien:  
  - `bsky-client/src/context/AppContext.jsx`  
  - `bsky-client/src/context/reducers/*.js` (insb. `listView.js`, `notifications.js`, `feed.js`, `profile.js`)  
- Aktuelle Situation:  
  - Reducer werden indirekt über Komponenten- und Integrationstests genutzt, aber es fehlen fokussierte Unit-Tests auf der Ebene der Reducer.
- Sinnvolle Tests:  
  - Unit-Tests pro Reducer:
    - `listViewReducer`:  
      - `SET_ACTIVE_LIST` (inkl. Lazy-Erstellung neuer Listen).  
      - `LIST_LOADED` (Merge-Logik, `topId`, `hasNew`, `cursor`-Handling).  
      - `LIST_SET_REFRESHING` / `LIST_SET_LOADING_MORE`.  
    - `notificationsReducer`:  
      - `REFRESH_NOTIFICATIONS` und `SET_NOTIFICATIONS_UNREAD`.  
    - `profileReducer` / `feedReducer`:  
      - Grundlegende Aktionen (z.B. `OPEN_PROFILE_VIEWER`-Folgen) ohne UI.

### 6. Thread-Handling (useThread-Hook)
- Dateien:  
  - `bsky-client/src/hooks/useThread.js`  
- Aktuelle Situation:  
  - Der Hook ist komplex (Lade-/Reload-Logik, Scroll-Verhalten, Fehlerpfade), aber nicht explizit getestet.
- Sinnvolle Tests:  
  - Unit-Tests mit gemocktem `AppContext` und `fetch`:
    - Erstladen eines Threads (URI -> Zustand `threadState`).  
    - Verhalten bei erneutem Aufruf mit gleicher URI (`threadState.active` / kein unnötiger Reload).  
    - Fehlerfälle (API-Fehler, Timeout) und Auswirkung auf `threadState`.

### 7. Hashtag-Suche / Hashtag-Viewer
- Dateien:  
  - `bsky-client/src/context/AppContext.jsx` (`hashtagSearch`-Slice)  
  - Ggf. Komponenten, die `OPEN_HASHTAG_SEARCH`/`CLOSE_HASHTAG_SEARCH` dispatchen.  
- Aktuelle Situation:  
  - Hashtag-Suche ist im State vorhanden, aber nicht explizit durch Tests abgedeckt.
- Sinnvolle Tests:  
  - Reducer-/Context-Tests:
    - `OPEN_HASHTAG_SEARCH` mit/ohne Label/Description.  
    - `CLOSE_HASHTAG_SEARCH` und Interaktion mit `OPEN_PROFILE_VIEWER` (Hashtag-Suche wird geschlossen).
  - Komponententests für eine zentrale Stelle, die Hashtag-Klicks in Aktionen umsetzt.

### 8. Media-Lightbox und Medien-Auswahl
- Dateien:  
  - `bsky-client/src/modules/shared/MediaLightbox.jsx`  
  - Hooks `useMediaLightbox` und Stellen, die `onViewMedia` verwenden (Timeline, Notifications, SearchView, ProfilePosts).  
- Aktuelle Situation:  
  - Engagement-/Notification-Tests prüfen einige `onViewMedia`-Verkabelungen, aber die eigentliche Lightbox-Logik ist nicht explizit getestet.
- Sinnvolle Tests:  
  - Unit-Tests für `useMediaLightbox`:
    - Öffnen/Schließen.  
    - Mehrere Medien und Initial-Index.  
  - Komponententest für `MediaLightbox`:
    - Keyboard-Navigation (Next/Prev, Escape).  
    - Darstellungen für Bild vs. Video.

---

## Dashboard (Frontend)

### 9. Datums-/Wiederholungslogik für Kampagnen
- Dateien:  
  - `dashboard/src/utils/timeUtils.ts`, `dashboard/src/utils/weekday.ts` (bereits teilweise getestet).  
  - Komponenten/Hooks, die wiederkehrende Kampagnen steuern (`useSkeets`, Form-Komponenten).  
- Aktuelle Situation:  
  - Basis-Funktionen wie `getRepeatDescription`, `weekdayOrder` sind getestet; End-to-End-Flows (z.B. Erstellung einer wiederkehrenden Kampagne) nicht.
- Sinnvolle Tests:  
  - Integrationstest eines „Skeet erstellen“-Flows:
    - Auswahl unterschiedlicher Wiederholungsmuster.  
    - Überprüfung, dass der Request-Payload die erwarteten Zeit-/Wochentagsparameter enthält.

### 10. Smoke-Tests für Skeet-History-Ansicht
- Dateien:  
  - `dashboard/src/components/SkeetHistoryPanel.tsx` (bereits getestet, aber fokussiert auf Rendering).  
  - Backend-Routen: `GET /api/skeets/:id/history`.  
- Aktuelle Situation:  
  - Es gibt getrennte Tests im Backend und im Dashboard, aber keinen End-to-End-Test, der beide Seiten zusammen betrachtet.
- Sinnvolle Tests:  
  - (Optional, wenn Test-Infrastruktur das zulässt) ein „API-mocked E2E“-Test:
    - Dashboard-Komponenten gegen einen gemockten Fetch-Layer, der die tatsächlichen Backend-Response-Shapes nutzt.  
    - Ziel: Schema-Drift zwischen Backend und Dashboard schneller sichtbar machen.

---

## Tests rund um Fehler- und Log-Verhalten

### 11. Logging-Konfiguration (Erweiterung)
- Dateien:  
  - `backend/src/utils/logging.js` (bereits getestet).  
- Aktuelle Situation:  
  - Es gibt Tests für Fallback-Verhalten (z.B. fehlende Schreibrechte), aber nicht für unterschiedliche Log-Level und ENV-Einstellungen im Zusammenspiel.
- Sinnvolle Ergänzungen:  
  - Tests, die verschiedene Kombinationen von `LOG_LEVEL`, `ENGAGEMENT_DEBUG` etc. setzen und prüfen:
    - Welche Level tatsächlich geschrieben werden.  
    - Dass engagement-spezifische Logs wie erwartet an-/abgeschaltet sind.

---

## Meta / Test-Infrastruktur

### 12. Selektive Test-Suites für CI-Stufen
- Dateien:  
  - `scripts/test-all.mjs`, `vitest.config.mjs`, evtl. GitHub Actions / CI-Skripte.  
- Idee (keine Codeänderung, nur Empfehlung):  
  - Einführung klarer Test-Gruppen:
    - `test:backend`, `test:client`, `test:dashboard`, `test:integration`.  
    - Optionale „langsamer aber gründlicher“ Suites (z.B. mit DB-Migrationen oder Cron-Simulation).
  - Sicherstellen, dass kritische Bereiche (Auth, Scheduler, Notifications, Search) immer in der schnellen CI-Stufe laufen.

---

Diese Liste ist bewusst fokussiert auf Stellen mit hoher Komplexität oder fachlicher Kritikalität, bei denen zusätzliche Tests einen spürbaren Stabilitätsgewinn erwarten lassen. Weitere Tests können sinnvoll sein, sobald neue Features hinzukommen (z.B. neue Feeds, weitere Notification-Typen oder zusätzliche Plattformen).  

