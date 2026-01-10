# Unreleased Changelog

# Dieses Dokument enthält alle Änderungen, die noch nicht in einem Release enthalten sind.
# Es werden nur Features, Fixes und Dokumentationsänderungen aufgeführt, die tatsächlich im BSky-Kampagnen-Client implementiert wurden.

# ---

## 2026-01-10

### Client

- **Fix:** Gepinnte Feeds werden beim Start zuverlässiger geladen (Refresh/Cache/Retry-Logik).

### Backend

- **Security:** CSRF-Schutz für alle nicht-GET `/api/*`-Requests, Rate-Limit beim Login, Session-Cookie `SameSite=Strict`.

### Dashboard

- **Security:** CSRF-Header wird zentral gesetzt, Logout und alle schreibenden Requests nutzen den CSRF-Flow.

### Electron/AppImage (Client)

- **Feature:** Link-Preview läuft ohne externen Server via IPC im Main-Process.
- **Fix:** AppImage-Temp-/SHM-Fallbacks und automatische Sandbox-Deaktivierung, wenn erforderlich.
- **Improvement:** Icons/Favicon eingebunden, Desktop-Icon-Mapping für KDE/Plasma verbessert.
- **Maintenance:** Electron auf 39.2.7 und electron-builder auf 26.4.0 aktualisiert.

### Docs

- **Update:** Beta-Client-Troubleshooting erweitert (Sandbox/Temp/Wayland).
- **Update:** Link-Preview-Proxy im Docker-Setup dokumentiert.

# ---

## 2026-01-08

### Infrastruktur & Deployment

- **Improvement:** Backend-Port wird in Docker Compose standardmaessig nicht mehr nach aussen freigegeben (nur internes Netzwerk).
- **Feature:** Bundle-Skripte unterstuetzen optionalen SCP-Upload per `--scp`/`-c` mit Ziel aus `scripts/target.conf`.

### Docs

- **Update:** Docker-Installationsanleitung und Scripts-Doku an das interne Backend und den optionalen SCP-Upload angepasst.

# ---

## 2026-01-04

### Client

- **Feature:** Standalone-Auth mit direkter Bluesky-API, Multi-Account-Login/-Wechsel und konsolidiertem Account-Menü (inkl. Nutzung im Profil).
- **Feature:** Profil-Bearbeitung als Modal (Avatar/Banner hochladen oder entfernen) sowie Benachrichtigungs-Abos für Posts/Antworten.
- **Feature:** Suche erweitert: lokalisierte Prefix-Hints, interner Profil-Viewer inkl. Profilverlauf, Follow/Unfollow-Buttons in der Personenliste.
- **Feature:** Share-/Report-/Moderationsaktionen im Post-Menü integriert (Thread stummschalten, Wörter/Tags stummschalten, Post/Antwort ausblenden).
- **Improvement:** Composer & Threads konsolidiert (Footer-Aktionen, Link-Paste mit Preview, einheitliche Feldhöhen, Overlay-Verhalten stabilisiert).
- **Improvement:** Feeds-Handling verbessert (Feed-Manager mit Draft/Custom-Ordering, Feed-Picker vorhydratisiert, Feeds-Timeline-Overlay & Performance).

### Backend

- **Feature:** `scheduledPlannedAt` ergänzt, trennt geplante Uhrzeit von `scheduledAt` (tatsächlicher Ausführungstermin) inkl. Migration/Import/Export-Anpassung.
- **Improvement:** Client-URLs werden in `Settings` persistiert (Credentials-API, Settings-Service); keine `.env`-Fallbacks für diese Werte.
- **Fix:** Wiederholungswert `0` wird serverseitig konsistent zu „keine Wiederholung“ normalisiert (API + Import).

### Dashboard

- **Improvement:** Session-Dauer ist in „Allgemein“ konfigurierbar, inklusive Validierung im ConfigPanel.
- **Fix:** Post-Editor normalisiert Wiederholungswert `0` beim Laden bestehender Posts.

### Shared UI

- **Improvement:** InlineMenu rendert portalled und verhält sich konsistenter über Layouts hinweg.

### Infrastruktur & CI

- **Improvement:** Electron-Skripte für Linux/Windows ergänzt; CI holt Media-Picker-Submodule zuverlässig.

# ---

## 2025-12-12

### Client & Backend

- **Improvement:** Polling-Fallbacks richten sich nun an Bluesky: Chat-Logs werden alle 60 Sekunden abgefragt und Dashboard-Polling (Threads/Skeets) nutzt die gleichen Intervall-Defaults (60 s aktiv, 5 min idle/hidden). Server-Config (`CLIENT_CONFIG`) und Dashboard-Fallbacks wurden entsprechend angepasst; `.env.sample` dokumentiert die neuen Werte.


### Backend

- **Feature:** Wiederkehrende Posts erhalten optional einen globalen Zufallsversatz (`SCHEDULER_RANDOM_OFFSET_MINUTES`), inkl. neuem Feld `repeatAnchorAt`, das die driftfreie Referenzzeit speichert; der Scheduler berechnet künftige Läufe jetzt aus diesem Anker und legt den zufälligen Offset pro Turnus an.
- **Improvement:** Pending- und Demo-Flows verwenden denselben Anker/Offset-Mechanismus, damit manuelle Nachholungen keine Dauerverschiebungen verursachen.

### Dashboard

- **Feature:** ConfigPanel → „Scheduler & Retry“ bietet ein neues Eingabefeld „Zufallsversatz (± Minuten)“ mit Validierung (0–120 Min.) und lokalisierter Fehlermeldung; Werte werden über die bestehenden Settings-Routen persistiert.

### Docs

- **Update:** API-, UI- und Benutzer-Doku beschreiben das neue Setting sowie das Verhalten von `repeatAnchorAt`; Datenbankschema und Changelog entsprechend ergänzt.

# ---

## 2025-11-27

### Client

- **Fix:** Initial-Load-Problem für „Popular with Friends“, „Mutuals“ und „Best Followers“ behoben; diese Listen laden jetzt korrekt bereits beim ersten Klick und zeigen nicht mehr einen leeren Zustand.
- **Improvement:** ScrollToTop-Verhalten finalisiert: harter Sprung nach oben (kein smooth scroll), löst Refresh aus wenn `hasNew === true` und Sichtbarkeit abhängig von Scrolltiefe oder `hasNew`.
- **Improvement:** Home-Button aktualisiert nun konsistent die **aktive** Liste und springt im Anschluss hart nach oben.

### Docs

- **New:** Erste Version der Entwickler-Checkliste (`listView-checklist.md`), inklusive klarer Schritte zur Integration neuer Listen/Feeds.
- **Improvement:** Architekturdokumentation erweitert und konsistent terminologisiert (Timeline, ListView, Initial-Load, Refresh, Polling, aktive Liste).

# ---

## 2025-11-26

### Client

- **Feature/Refactor:** Einführung der neuen **ListView-Architektur** für alle Listen (Timelines, Notifications, spätere Profil-Listen); vereinheitlichtes Modell für Laden, Initial-Load, Refresh, Load-More, ScrollToTop und Polling.
- **Feature:** Neues Polling-System (`useListPolling`), das Top-IDs leichtgewichtig abfragt und ausschließlich `hasNew` setzt, ohne automatische Reloads.
- **Feature:** Neues zentrales ListView-Service (`listService.js`), das sämtliche API-Interaktionen bündelt: erste Seite laden, Refresh (Merge neuer Elemente), Cursoring / Load-More, Top-ID-Abfragen für Polling.
- **Refactor:** `ClientApp.jsx` steuert jetzt die komplette ListView-Navigation (`activeListKey`) und alle Refresh-Trigger (Home, ScrollToTop, Tab-Aktivierung).
- **UI:** Timelines und Notifications rendern vollständig aus dem neuen ListView-State; SWR-Abhängigkeiten wurden entfernt.
- **Fix:** Konsistentes Anzeigen der Ladezustände (Spinner / Skeleton) in allen ListViews.

### Backend

- **Known Issue:** Notifications-TopID-Polling (`GET /api/bsky/notifications?limit=1`) erzeugt noch HTTP 500; wird als separater Task unter „Backend überarbeiten“ weitergeführt.

### Docs

- **New:** vollständige technische Dokumentation der ListView-Architektur (`listView-architecture.md`).
- **Improvement:** Meta-Struktur, Schlüssel, Lebenszyklus und UI-Verhalten einheitlich erklärt.

# ---

## 2025-11-25

### Client

- **Fix:** Fokusproblem im Compose-Modal (Eingabefeld war initial nicht aktiv).
- **Improvement:** Kleinere UI-Korrekturen in den Scroll-Containern.

# ---

## 2025-11-24

### Client

- **Fix:** Problem mit zweifachem Scroll-Container untersucht und CSS-Konflikt lokalisiert; Anpassungen führen zu stabilerer Scroll-Experience.

# ---
