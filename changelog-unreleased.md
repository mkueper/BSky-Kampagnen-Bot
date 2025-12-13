# Unreleased Changelog

# Dieses Dokument enthält alle Änderungen, die noch nicht in einem Release enthalten sind.
# Es werden nur Features, Fixes und Dokumentationsänderungen aufgeführt, die tatsächlich im BSky-Kampagnen-Client implementiert wurden.

# ---

## 2025-12-12

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
