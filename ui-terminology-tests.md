# UI-Terminologie- und Label-Tests (Entwurf)

Dieser Entwurf beschreibt, wie wir die Vorgaben aus `docs/ui.md` automatisiert gegen das Dashboard-UI testen wollen. Es handelt sich noch **nicht** um implementierte Tests, sondern um eine Spezifikation, die wir später in Vitest/Jest o. Ä. gießen können.

## Ziele

- Sicherstellen, dass alle sichtbaren Bezeichnungen im Dashboard zur Terminologie aus `docs/ui.md` passen.
- Verhindern, dass veraltete Begriffe (z. B. „Skeet“) in der UI wieder auftauchen.
- Besonders „prominente“ Labels (groß gesetzte Überschriften, Summary-Karten, Tabs) im Blick behalten.

## Scope

Im ersten Schritt fokussieren wir uns auf das **Dashboard** (`dashboard/src`):

- Navigation (`NAV_ITEMS` in `dashboard/src/App.jsx`)
- Header-/Seitentitel (`HEADER_TITLES`, `HEADER_CAPTIONS`)
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

### Übersichtskarten & Summary

- In `overviewStatsSkeets` (Dashboard-Übersicht):
  - `"Geplante Posts"`
  - `"Veröffentlichte Posts"`
- In `MainOverviewView`:
  - `"Geplante Posts"`, `"Veröffentlichte Posts"`
  - `"Nächster Post"`
  - `"Bevorstehende Posts"`
  - `"Kein geplanter Post."`, `"Keine anstehenden Posts."`

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

## Negative Checks

Zusätzlich zu den „positiven“ Label-Checks sollten Tests sicherstellen, dass bestimmte Begriffe **nicht** mehr in sichtbaren UI-Texten auftauchen:

- Verbotene Begriffe in UI-Strings:
  - `"Skeet"` / `"Skeets"` (nur noch in internen Namen/Kommentaren ok)
  - ggf. alte Panel-Titel wie `"Skeet Aktivität"`, `"Geplante Skeets"`, `"Veröffentlichte Skeets"`

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
