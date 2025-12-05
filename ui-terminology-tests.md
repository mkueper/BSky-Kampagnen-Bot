# UI-Terminologie- und Label-Tests (Entwurf)

Dieser Entwurf beschreibt, wie wir die Vorgaben aus `docs/ui.md` automatisiert gegen das Dashboard-UI testen wollen. Es handelt sich noch **nicht** um implementierte Tests, sondern um eine Spezifikation, die wir später in Vitest/Jest o. Ä. gießen können.

## Ziele

- Sicherstellen, dass alle sichtbaren Bezeichnungen im Dashboard zur Terminologie aus `docs/ui.md` passen.
- Verhindern, dass veraltete Begriffe (z. B. „Skeet“) in der UI wieder auftauchen.
- Besonders „prominente“ Labels (groß gesetzte Überschriften, Summary-Karten, Tabs) im Blick behalten.

## Scope

Im ersten Schritt fokussieren wir uns auf das **Dashboard** (`dashboard/src`):

- Navigation (`NAV_ITEMS` in `dashboard/src/App.jsx`)
- Header-/Seitentitel (`HEADER_TITLES`, `HEADER_CAPTIONS`, i18n-Keys in `dashboard/src/i18n/messages.js`)
- Panels und Summary-Karten:
  - `ActivityPanel` (Post-Aktivität)
  - `SummaryCard`-Titel (z. B. „Nächster Post“)
  - Kennzahlenlabels (z. B. „Geplante Posts“, „Veröffentlichte Posts“)
- Post-Listen:
  - `PlannedSkeetList.jsx`
  - `PublishedSkeetList.jsx`
  - `DeletedSkeetList.jsx`
- Formulare & Aktionen:
  - `SkeetForm.jsx` (Post-Formular)
  - `useSkeetActions.js` (Post-Aktionen)
- Konfiguration & Login:
  - `ConfigPanel.jsx` (Scheduler, Polling, Zugangsdaten)
  - `views/LoginView.jsx`
  - Layout (`components/layout/AppLayout.jsx`)

Der `bsky-client` sowie andere Frontends (z. B. Mastodon-spezifische UIs) werden später separat betrachtet.

### Bluesky-Client (`bsky-client`)

Der integrierte Bluesky-Client ist **plattform-spezifisch**, soll aber terminologisch so nah wie möglich an der offiziellen Bluesky-UI (deutsch) bleiben. Für Tests gilt:

- Der Client darf Bluesky-spezifische Konzepte direkt abbilden (Feed, Thread, Post etc.).
- Für Actions/Buttons verwenden wir dieselben Begriffe wie im Dashboard:
  - `Reply` → „Antworten“
  - `Repost` → „Reposten“
  - `Quote Post` → „Post zitieren“
- Sichtbare Begriffe wie „Skeet/Skeets“ sollen auch im Client nicht mehr verwendet werden; stattdessen „Post/Posts“.
- Tests für den Client prüfen insbesondere:
  - Kontextmenüs (Post-Aktionen),
  - Buttons unter Posts,
  - Tooltips/`aria-label`s,
  - leere Zustände/Statusmeldungen, die Posts/Threads erwähnen.

## Terminologie-Regeln (aus `docs/ui.md`)

### Posts

- Im UI sprechen wir durchgängig von **Posts** (statt „Skeets“).
- Beispiele:
  - „Geplante Posts“
  - „Veröffentlichte Posts“
  - „Wartende Posts“
  - „Nächster Post“
- „Skeet“ darf in sichtbaren Texten nicht mehr vorkommen (nur noch in internen Namen/Kommentaren).

### Produktname

- Produktname im UI: **„Kampagnen‑Tool“** (mit Bindestrich) an prominenten Stellen:
  - App-Header
  - About-Überschrift
  - ggf. Fenster-/Titelzeile (Electron)
- Im Fließtext: **„Kampagnen‑Tool“**.
- Plattform-spezifische Bereiche behalten ihre Namen:
  - z. B. „Bluesky Client“.

### Posts-Navigation

- Navigation (Sidebar):
  - Hauptpunkt: **„Posts“**
  - Unterpunkte:
    - „Aktivität“
    - „Planen“
- Header:
  - **„Posts – Übersicht“** für die Gesamtübersicht.
  - **„Post planen“** für den Planer.
- Panels:
  - Panel-Titel: **„Post-Aktivität“**

## Konkrete Labels, die getestet werden sollen

### Navigation / Header

- `NAV_ITEMS`:
  - `skeets.label === "Posts"`
  - `skeets.children`:
    - `"Aktivität"`
    - `"Planen"`
- `HEADER_TITLES`:
  - `skeets` & `skeets-overview`: `"Posts – Übersicht"`
  - `skeets-plan`: `"Post planen"`
- i18n-Keys in `dashboard/src/i18n/messages.js`:
  - `nav.skeets === "Posts"`
  - `nav['skeets-overview'] === "Aktivität"`
  - `nav['skeets-plan'] === "Planen"`
  - `header.caption.skeets` & `header.title.skeets` → `"Posts – Übersicht"`
  - `header.caption['skeets-plan']` & `header.title['skeets-plan']` → `"Post planen"`
  - Produktname (prominente Stellen): `layout.nav.appName === "Kampagnen‑Tool"`

### Übersichtskarten & Summary

- In `overviewStatsSkeets` (Dashboard-Übersicht):
  - `"Geplante Posts"`
  - `"Veröffentlichte Posts"`
- In `MainOverviewView`:
  - `"Geplante Posts"`, `"Veröffentlichte Posts"`
  - `"Nächster Post"`
  - `"Bevorstehende Posts"`
  - `"Kein geplanter Post."`, `"Keine anstehenden Posts."`
- i18n-Keys:
  - `overview.cards.plannedPosts === "Geplante Posts"`
  - `overview.cards.publishedPosts === "Veröffentlichte Posts"`
  - `overview.next.postTitle === "Nächster Post"`
  - `overview.next.noPost === "Kein geplanter Post."`
  - `overview.upcoming.postsTitle === "Bevorstehende Posts"`
  - `overview.upcoming.noPosts === "Keine anstehenden Posts."`

### Post-Aktivität (DashboardView)

- Panel-Header:
  - Titel: `"Post-Aktivität"`
  - Beschreibung enthält: `"geplante und veröffentlichte Posts"`
- Tabs:
  - `"Geplant"`, `"Veröffentlicht"`, `"Wartend"`, `"Papierkorb"`

### Listen (Planned/Published/Deleted)

- `PlannedSkeetList` (Empty State):
  - `"Noch keine Posts geplant."`
  - `"Nutze den Planer, um deinen ersten Post zu terminieren."`
- `PublishedSkeetList` (Empty State):
  - `"Noch keine veröffentlichten Posts."`
  - `"Sobald Posts live sind, erscheinen sie hier mit allen Kennzahlen."`
- `DeletedSkeetList` (Empty State):
  - `"Keine gelöschten Posts."`
  - `"Gelöschte Posts erscheinen hier und können reaktiviert oder endgültig entfernt werden."`

### Formular & Aktionen (SkeetForm / useSkeetActions)

- `SkeetForm`:
  - Überschrift: `"Post bearbeiten"` / `"Neuen Post planen"`
  - Feldlabel: `"Post-Text"`
  - Fehlertexte: `"Der Post darf maximal … Zeichen enthalten."`
  - Buttons:
    - `"Post aktualisieren"`
    - `"Sofort senden"`
  - Erfolgsmeldungen:
    - `"Post geplant"`
    - `"Post aktualisiert"`
    - `"Der Post wurde unmittelbar gesendet."`
  - Fehler: `"Post konnte nicht erstellt werden."`, `"Unerwartete Antwort beim Erstellen des Posts."`
- `useSkeetActions`:
  - Dialog-/Toast-Titel und -Texte durchgängig mit „Post“/„Posts“ (Löschen, Zurückziehen, endgültig löschen, reaktivieren).

#### i18n-Keys für Posts-Formular (`dashboard/src/i18n/messages.js`)

- Überschrift & Subtexte:
  - `posts.form.headingEdit === "Post bearbeiten"`
  - `posts.form.headingCreate === "Neuen Post planen"`
  - `posts.form.maxLengthHint` enthält „Maximal {limit} Zeichen … Posts“.
- Content-Feld:
  - `posts.form.content.label === "Post-Text"`
  - `posts.form.content.placeholder === "Was möchtest du veröffentlichen?"`
- Buttons:
  - `posts.form.submitUpdate === "Post aktualisieren"`
  - `posts.form.submitCreate === "Planen"`
  - `posts.form.sendNow.buttonDefault === "Sofort senden"`
  - `posts.form.sendNow.buttonBusy === "Senden…"`
- Erfolgs-/Fehlertexte:
  - `posts.form.saveSuccessCreateTitle === "Post geplant"`
  - `posts.form.saveSuccessUpdateTitle === "Post aktualisiert"`
  - `posts.form.sendNow.createErrorFallback` und `sendNow.unexpectedCreateResponse` enthalten „Post …“ statt „Skeet“.

### Config & Login (Dashboard)

#### ConfigPanel – Scheduler & Polling

- Sichtbare Begriffe:
  - Tab-Titel:
    - `"Scheduler & Retry"`
    - `"Dashboard-Polling"`
    - `"Zugangsdaten"`
  - Scheduler-Panel:
    - `"Scheduler & Retry"`
    - `"Passe Cron, Zeitzone und Retry-Strategie für das Kampagnen‑Tool an."`
    - Feldlabels: `"Cron-Ausdruck"`, `"Zeitzone"`, `"Maximale Wiederholversuche"`, `"Basis-Backoff (ms)"`, `"Maximaler Backoff (ms)"`
    - Buttontexte: `"Zurücksetzen auf Standard"`, `"Einstellungen speichern"`
  - Polling-Panel:
    - `"Dashboard-Polling"`
    - `"Steuere Intervalle und Backoff für Listen (Threads & Posts)."`
    - Labels: `"Threads: Aktiv (ms)"`, `"Threads: Idle (ms)"`, `"Threads: Hidden (ms)"`, `"Threads: Minimal Ping hidden"`
    - `"Posts: Aktiv (ms)"`, `"Posts: Idle (ms)"`, `"Posts: Hidden (ms)"`, `"Posts: Minimal Ping hidden"`
    - `"Backoff Start (ms)"`, `"Backoff Max (ms)"`, `"Jitter Ratio (0..1)"`, `"Heartbeat (ms)"`
    - Buttons: `"Zurücksetzen auf Standard"`, `"Einstellungen speichern"`
- i18n-Keys:
  - Tabs:
    - `config.tabs.scheduler === "Scheduler & Retry"`
    - `config.tabs.polling === "Dashboard-Polling"`
    - `config.tabs.credentials === "Zugangsdaten"`
  - Scheduler:
    - `config.scheduler.heading === "Scheduler & Retry"`
    - `config.scheduler.subtitle` enthält „Kampagnen‑Tool“ exakt so wie in `docs/ui.md`.
    - `config.scheduler.labels.scheduleTime === "Cron-Ausdruck"`
    - `config.scheduler.labels.timeZone === "Zeitzone"`
    - `config.scheduler.labels.postRetries === "Maximale Wiederholversuche"`
    - `config.scheduler.labels.postBackoffMs === "Basis-Backoff (ms)"`
    - `config.scheduler.labels.postBackoffMaxMs === "Maximaler Backoff (ms)"`
    - `config.scheduler.resetButton === "Zurücksetzen auf Standard"`
    - `config.scheduler.saveLabel === "Einstellungen speichern"`
  - Polling:
    - `config.polling.heading === "Dashboard-Polling"`
    - `config.polling.subtitle` enthält „Threads & Posts“.
    - `config.polling.labels.threadActiveMs === "Threads: Aktiv (ms)"` usw. für alle oben genannten Labels.
    - `config.polling.resetButton === "Zurücksetzen auf Standard"`
    - `config.polling.saveLabel === "Einstellungen speichern"`

#### CredentialsSection (Zugangsdaten)

- Sichtbare Begriffe:
  - Abschnittsüberschrift: `"Zugangsdaten"`
  - Untertitel: `"Server-URLs und Logins für Bluesky und Mastodon."`
  - Abschnittstitel: `"Bluesky"`, `"Mastodon"`, `"Tenor (GIF Suche)"`
  - Labels:
    - `"Server URL"`, `"Identifier (Handle/E-Mail)"`, `"App Password"`
    - `"API URL"`, `"Access Token"`, `"API Key"`
  - Hilfetexte:
    - `"Leer lassen, um das bestehende Passwort zu behalten."`
    - `"Leer lassen, um das bestehende Token zu behalten."`
    - `"Leer lassen, um den bestehenden Key zu behalten. Aktiviert die GIF-Suche (Tenor)."`
  - Buttons:
    - `"Zugangsdaten speichern"` (Busy: `"Speichere …"`)
  - Hinweiskarte bei fehlenden Credentials:
    - `"Zugangsdaten erforderlich"`
    - `"Bitte hinterlege zuerst deine Zugangsdaten für Bluesky (und optional Mastodon). …"`
- i18n-Keys:
  - `config.credentials.heading === "Zugangsdaten"`
  - `config.credentials.subtitle === "Server-URLs und Logins für Bluesky und Mastodon."`
  - `config.credentials.bluesky.heading === "Bluesky"`
  - `config.credentials.mastodon.heading === "Mastodon"`
  - `config.credentials.tenor.heading === "Tenor (GIF Suche)"`
  - `config.credentials.bluesky.serverUrlLabel === "Server URL"`
  - `config.credentials.bluesky.identifierLabel === "Identifier (Handle/E-Mail)"`
  - `config.credentials.bluesky.appPasswordLabel === "App Password"`
  - `config.credentials.bluesky.appPasswordHint` entspricht exakt dem Hilfetext.
  - Entsprechende Keys für `mastodon.*` und `tenor.*` wie oben beschrieben.

### Login (Dashboard)

- Sichtbare Begriffe:
  - Tagline: `"Control Center"`
  - Titel: `"Kampagnen‑Tool Login"`
  - Untertitel: `"Zugangsdaten werden serverseitig verwaltet."`
  - Labels: `"Benutzername"`, `"Passwort"`
  - Buttons:
    - `"Konfiguration prüfen"`
    - `"Anmelden"` (Busy: `"Anmeldung läuft…"`).
  - Hinweisblock bei noch nicht konfiguriertem Login: Schritte 1–3 verwenden die Begriffe wie in `docs/ui.md` (ENV-Keys, „Backend“, etc.).
- i18n-Keys:
  - `login.heading === "Kampagnen‑Tool Login"`
  - `login.subtitle === "Zugangsdaten werden serverseitig verwaltet."`
  - `login.usernameLabel === "Benutzername"`
  - `login.passwordLabel === "Passwort"`
  - `login.submitLabel === "Anmelden"`
  - `login.submitBusy === "Anmeldung läuft…"`
  - `login.unconfigured.checkConfig === "Konfiguration prüfen"`

## Negative Checks

Zusätzlich zu den „positiven“ Label-Checks sollten Tests sicherstellen, dass bestimmte Begriffe **nicht** mehr in sichtbaren UI-Texten auftauchen:

- Verbotene Begriffe in UI-Strings:
  - `"Skeet"` / `"Skeets"` (nur noch in internen Namen/Kommentaren ok)
  - ggf. alte Panel-Titel wie `"Skeet Aktivität"`, `"Geplante Skeets"`, `"Veröffentlichte Skeets"`

### Wertebereiche (Min/Max) für numerische Felder

Neben den Texten sollten die UI-Tests auch prüfen, dass definierte Mindest-/Höchstwerte für numerische Eingaben eingehalten werden. Beispiele:

- Scheduler & Retry (ConfigPanel):
  - `postRetries`, `postBackoffMs`, `postBackoffMaxMs`:
    - dürfen im UI nur **nicht-negative** Werte akzeptieren (`min=0`),
    - Backend validiert ebenfalls positiv („POST_RETRIES und Backoff-Werte müssen positive Zahlen sein.“).
  - `graceWindowMinutes`:
    - Mindestwert **2 Minuten** (`min=2` im UI),
    - Backend-Validierung: `SCHEDULER_GRACE_WINDOW_MINUTES` muss `>= 2` sein.
- Dashboard-Polling:
  - Alle Polling-Intervalle (`THREAD_*`, `SKEET_*`) und Backoff/Heartbeat:
    - `>= 0` (UI lässt keine negativen Werte zu, Backend lehnt sie ab).
  - `POLL_JITTER_RATIO`:
    - muss zwischen `0` und `1` liegen (UI und Backend-Validierung).

Tests sollten sowohl:
- die Attribute der Input-Felder (`min`, `max`, `step`) prüfen, als auch
- die Reaktion des Backends auf Werte **außerhalb** des erlaubten Bereichs (z. B. erwartete Fehlermeldung).

Technisch können wir das z. B. so prüfen:

- Alle `dashboard/src/**/*.jsx`/`.js` nach String-Literalen durchsuchen.
- Diese Literale gegen eine Positiv-/Negativliste vergleichen (oder gezielt per RegEx auf verbotene Begriffe testen).

## Interne Bezeichner / Identifikatoren

- Für **interne Identifikatoren** (Code, Dateinamen, Keys) verwenden wir konsequent **englische Begriffe**:
  - Beispiele: `posts`, `threads`, `pending_manual`, `scheduler`, `campaignToolBackend`.
  - Historische Namen wie `SkeetForm`, `useSkeets`, `skeetService` bleiben vorerst bestehen, solange sie keine sichtbaren UI-Texte enthalten.
- Sichtbare Texte folgen der deutschsprachigen UI-Terminologie (z. B. „Post“, „Thread“, „Kampagnen‑Tool“); interne Namen sind davon unabhängig.
- Tests in diesem Dokument beziehen sich ausschließlich auf **sichtbare UI-Strings** und erzwingen keine Umbenennung interner Bezeichner.

## Umsetzungsidee für Tests (später)

- Testdatei, z. B. `dashboard/__tests__/uiTerminology.test.js`.
- Grober Aufbau:
  - `it("verwendet die erwarteten Labels in NAV_ITEMS", ...)`
  - `it("zeigt die richtigen Kennzahlen-Labels in overviewStatsSkeets", ...)`
  - `it("enthält keine verbotenen Begriffe wie 'Skeet' in UI-Strings", ...)`
- Zum Auslesen:
  - Entweder direkte Imports der entsprechenden Module (`App.jsx`, `MainOverviewView.jsx`, etc.)
  - oder bei String-Suchen ein einfacher Datei-Scan (z. B. via Node-FS und RegEx) innerhalb des Tests.

Diese Datei dient vorerst nur als Referenz, bis wir die offenen UI-Fragen (v. a. rund um den `bsky-client`) geklärt haben und die Tests tatsächlich implementieren. 
