# Tickets: Frontend-Anwendungen isolieren (`dashboard` ↔ `bsky-client`)

Ziel: `dashboard` und `bsky-client` sind zwei komplett eigenständige Frontend-Apps ohne direkte Abhängigkeiten voneinander. Gemeinsame Teile werden über klar definierte Shared-Pakete bereitgestellt.

## Zielbild Frontend-Isolation (Kurzfassung)

1. `dashboard` und `bsky-client` sind vollständig entkoppelt:
   - keine App-zu-App-Imports,
   - kein eingebetteter Bluesky-Client im Dashboard.
2. Gemeinsame UI-/Theme-Bausteine liegen in `@bsky-kampagnen-bot/shared-ui`:
   - präsentationsorientiert, plattformagnostisch, style-adaptiv.
3. Gemeinsame Logik/Typen (ohne UI) liegen in dedizierten Shared-Paketen:
   - z.B. `shared-logic`, `shared-types`, nicht in den Apps selbst.
4. Jedes Frontend hat eigenes Routing und Layout:
   - Shared-UI wird nur innerhalb dieser App-Rahmen eingesetzt.
5. Neue Frontends (z.B. Mastodon-Client) können ohne strukturelle Änderungen an bestehenden Apps auf dieselben Shared-Pakete aufsetzen.

## Ticket 1: Architektur-Entscheidung dokumentieren (ADR)

- **Beschreibung:** Architektur-Decision-Record anlegen, der das Zielbild beschreibt: keine App-zu-App-Imports, nur Shared-Pakete; beide Apps konsumieren dieselben Backend-APIs.
- **Ergebnis:** Kurzes Markdown-Dokument im Repo (z.B. `docs/adr/frontend-isolation.md`), das Motivation, Entscheidung und Konsequenzen beschreibt.
- **Priorität:** Hoch
- **Aufwand:** S
- **Status:** Erledigt (ADR-0001 angelegt)

## Ticket 2: Ist-Zustand der Kopplung `dashboard` ↔ `bsky-client` erfassen

- **Beschreibung:** Alle Stellen dokumentieren, an denen `dashboard` den `bsky-client` importiert oder verwendet. Kurz festhalten, *wofür* der `bsky-client` im `dashboard` heute genutzt wird.
- **Ergebnis:** Liste der relevanten Imports/Verwendungen + Beschreibung der aktuellen Use-Cases im `dashboard`.
- **Priorität:** Hoch
- **Aufwand:** S
- **Status:** Erledigt (Kopplung inzwischen entfernt; Fundstellen unten sind historisch)

### Aktueller Stand (Stand 2025-12-25)

- `dashboard/package.json` enthält keine Abhängigkeit auf `bsky-client`.
- `dashboard/vite.config.js` enthält keinen Alias/Resolver für `bsky-client`.
- `dashboard/src/App.jsx` rendert keine eingebettete `bsky-client`-App.

### Historischer Fund / Kopplungsstellen (Stand 2025-12-06)

- `dashboard/package.json`: Direkte Laufzeitabhängigkeit auf `bsky-client`:
  - `dependencies.bsky-client: "^0.1.0"`.
- `dashboard/vite.config.js`: Vite-Alias, der das `bsky-client`-Workspace-Verzeichnis direkt als Modul `bsky-client` einbindet:
  - `resolve.alias["bsky-client"] = path.resolve(workspaceRoot, "bsky-client/src")`.
- `dashboard/src/App.jsx`:
  - Import des Layout-Providers aus dem `bsky-client`:
    - `import { LayoutProvider } from 'bsky-client/context/LayoutContext.jsx'`
  - Lazy-Import der kompletten `bsky-client`-App:
    - `const BskyClientAppLazy = lazy(() => import('bsky-client'))`
  - Navigationseintrag für den integrierten `bsky-client`:
    - `NAV_ITEMS` enthält `{ id: 'bsky-client', label: 'Bluesky Client', ... }`.
  - Nutzung der eingebetteten App je nach View:
    - Wenn `activeView === 'bsky-client'`, wird
      - `<BskyClientAppLazy onNavigateDashboard={() => navigate('overview')} />`
      - innerhalb von `<Suspense>` gerendert.
  - Gesamtes Dashboard ist in den `LayoutProvider` aus dem `bsky-client` eingehüllt:
    - Root-Komponente `App` rendert:
      - `<LayoutProvider><DashboardApp ... /></LayoutProvider>`.

### Aktuelle Use-Cases im Dashboard

- `DashboardApp` ist die zentrale Oberfläche für Kampagnenplanung, Skeets und Threads – vollständig eigene Views und Hooks im `dashboard`.
- Der `bsky-client` wird als separater View (`activeView === 'bsky-client'`) in das `dashboard` eingebettet, um:
  - einen vollständigen Bluesky-Client innerhalb des Dashboards anzubieten.
  - bei Bedarf zurück ins Dashboard zu navigieren (`onNavigateDashboard`-Callback).
- Der `LayoutProvider` des `bsky-client` wird genutzt, um Layout-/UI-Verhalten des `bsky-client` auch im Dashboard-Kontext zur Verfügung zu stellen.

## Ticket 3: Shared-UI-Paket anlegen (`packages/shared-ui`)

- **Beschreibung:** Neues Shared-Paket für UI-Komponenten anlegen (TypeScript/React), Build/Tests einrichten und im Workspace registrieren.
- **Ergebnis:** `packages/shared-ui` existiert und kann von `dashboard` und `bsky-client` importiert werden (z.B. über `@app/shared-ui`).
- **Priorität:** Hoch
- **Aufwand:** M
- **Status:** Erledigt (Paket existiert und wird genutzt)

### Hinweis zu Ticket 3

- `@bsky-kampagnen-bot/shared-ui` ist als Workspace-Paket bereits angelegt, in der Root-`package.json` registriert und wird von `dashboard` und `bsky-client` aktiv verwendet.
- Weitere Arbeiten an `shared-ui` (Konsolidierung, Style-Adaption, neue Komponenten) erfolgen im Rahmen der nachgelagerten Tickets (insb. Ticket 4 und Style-Zielen unten).

### Aktueller Bestand Shared-UI-Nutzung

Gemeinsam in **beiden** Frontends (`dashboard`, `bsky-client`) bereits im Einsatz:

- `ToastProvider`, `ThemeProvider`
  - `bsky-client/src/index.jsx`, `bsky-client/src/main.jsx`
  - `dashboard/src/main.jsx`
- `Button`
  - `bsky-client/src/ClientApp.jsx`
  - `bsky-client/src/modules/profile/ProfilePosts.jsx`
  - `bsky-client/src/modules/settings/SettingsView.jsx`
  - `dashboard/src/components/SkeetForm.jsx`
  - `dashboard/src/components/ThreadForm.jsx`
  - `dashboard/src/components/ConfigPanel.jsx`
  - `dashboard/src/components/ThreadOverview.jsx`
  - `dashboard/src/components/views/DashboardView.jsx`
  - `dashboard/src/components/views/LoginView.jsx`
  - `dashboard/src/components/views/ThreadDashboardView.jsx`
  - `dashboard/src/components/ui/ConfirmDialog.jsx`
- `Card`
  - `bsky-client/src/modules/timeline/SkeetItemSkeleton.jsx`
  - `bsky-client/src/modules/notifications/NotificationCardSkeleton.jsx`
  - `bsky-client/src/modules/profile/ProfileMetaSkeleton.jsx`
  - `bsky-client/src/modules/profile/ProfilePosts.jsx`
  - `bsky-client/src/modules/settings/SettingsView.jsx`
  - `bsky-client/src/modules/shared/ProfilePreview.jsx`
  - `dashboard/src/components/ConfigPanel.jsx`
  - `dashboard/src/components/ThreadOverview.jsx`
  - `dashboard/src/components/views/AboutView.jsx`
  - `dashboard/src/components/views/LoginView.jsx`
- `ScrollTopButton`
  - `bsky-client/src/modules/timeline/index.js` (Re-Export)
  - `dashboard/src/components/layout/AppLayout.jsx`
- `ThemeToggle`
  - `bsky-client/src/modules/layout/SidebarNav.jsx`
  - (Im Dashboard zukünftig einsetzbar; derzeit noch kein direkter Import.)
- `InlineMenu`, `InlineMenuTrigger`, `InlineMenuContent`, `InlineMenuItem`
  - `bsky-client/src/modules/shared/RichText.jsx`
  - (Im Dashboard derzeit nicht genutzt, aber perspektivisch wiederverwendbar.)
- `useToast`
  - `dashboard/src/App.jsx`
  - `dashboard/src/components/SkeetForm.jsx`
  - `dashboard/src/components/ThreadForm.jsx`
  - `dashboard/src/components/ConfigPanel.jsx`
  - `dashboard/src/components/ThreadOverview.jsx`
  - `dashboard/src/components/views/DashboardView.jsx`
  - `dashboard/src/components/views/ThreadDashboardView.jsx`
  - (Im `bsky-client` aktuell nur in Tests gemockt, nicht direkt importiert.)

Diese Liste dient als Ausgangspunkt, um Shared-UI-Refactorings zunächst auf bereits gemeinsam genutzte Bausteine zu konzentrieren (Buttons/Cards/Toasts/Theme), bevor neue gemeinsame Komponenten wie ein Thread-Editor eingeführt werden.

### Style-adaptives Shared-UI – erstes Ziel

- Ziel: Die bereits gemeinsam genutzten Shared-UI-Komponenten (`Button`, `Card`, `ThemeToggle`, `ToastProvider`/`useToast`) sollen sich konsistent an das jeweils umgebende Designsystem anpassen können, ohne ein eigenes, hart verdrahtetes Styling durchzusetzen.
- Fokus:
  - `Button` und `Card` bieten klar definierte Varianten (z.B. `variant`, `size`), setzen aber auf vom Konsumenten gelieferte Klassen/Theme-Tokens auf.
  - `ThemeToggle` und `ThemeProvider` arbeiten mit gemeinsam definierten Theme-Tokens, die in allen Frontends genutzt werden können.
  - `ToastProvider`/`useToast` stellen Verhalten und Struktur bereit, das visuelle Styling bleibt über Theme/Tokens anpassbar.
- Umsetzung erfolgt schrittweise im Rahmen anderer Tickets (z.B. beim Extrahieren/Anpassen von UI-Komponenten), nicht als separater Big-Bang-Refactor.

## Ticket 4: Gemeinsame UI-Komponenten in `shared-ui` extrahieren

- **Beschreibung:** UI-Komponenten identifizieren, die sowohl im `dashboard` als auch im `bsky-client` genutzt werden (oder genutzt werden sollen), und sie – wo sinnvoll – als generische, präsentationsorientierte Bausteine in `shared-ui` bereitstellen (keine API-Calls, Daten nur über Props).
- **Ergebnis:** `shared-ui` exportiert wiederverwendbare UI-Komponenten, die in beiden Frontends (und zukünftigen Clients) genutzt werden können, ohne Plattform- oder Business-Logik zu enthalten.
- **Priorität:** Hoch
- **Aufwand:** M–L
- **Status:** Erledigt (erste gemeinsame Komponente umgesetzt)

### Scope & erste Kandidaten für Ticket 4

- Fokus liegt zunächst auf bereits ähnlichen/duplizierten UI‑Mustern, z.B.:
  - Karten/Skelette für Listenansichten (Skeets/Threads/Benachrichtigungen),
  - wiederkehrende Layout-Container (z.B. einfache Panels, Sektionen),
  - einfache Status-/Badge-/Label-Elemente.
- Konkrete erste Kandidaten:
  - Dashboard-Quellen:
    - `dashboard/src/components/ui/SummaryCard.jsx` (Kennzahlen-Kachel mit optionalem „Nächster Post/Thread“-Snippet).
    - `dashboard/src/components/ui/ActivityPanel.jsx` (Grid mit Kennzahlen-Karten, z.B. Post-/Thread-Aktivität).
  - Bluesky-Client-Quellen:
    - `bsky-client/src/modules/timeline/SkeetItemSkeleton.jsx` und `bsky-client/src/modules/notifications/NotificationCardSkeleton.jsx` (skelettonisierte Card-Layouts).
    - `bsky-client/src/modules/profile/ProfileMetaSkeleton.jsx` (Profil-Metakarten).
  - Kombination:
    - Gemeinsame “Panel/Section”-Wrapper (ähnliche Panel-Layouts in Dashboard-Übersichten und Bluesky-Client-Ansichten).
- Komponenten mit klarer Fachlogik (z.B. vollständige Timeline- oder Thread-Ansichten) bleiben vorerst in den jeweiligen Apps und werden erst später – falls sinnvoll – in kleinere, generische Presenter aufgeteilt.

### Bisher umgesetzte gemeinsame UI-Komponenten

- `ConfirmDialog` + `useConfirmDialog`
  - Implementiert als generische, präsentationsorientierte Komponenten in `@bsky-kampagnen-bot/shared-ui`:
    - `packages/shared-ui/src/components/ConfirmDialog.jsx`
    - `packages/shared-ui/src/hooks/useConfirmDialog.js`
  - Verwendung im Dashboard:
    - `dashboard/src/App.jsx` nutzt jetzt `ConfirmDialog` und `useConfirmDialog` direkt aus `shared-ui`.
  - Verwendung im Bluesky-Client:
    - `bsky-client/src/modules/layout/Modals.jsx` verwendet `ConfirmDialog` für den „Entwurf verwerfen?“-Dialog.
- Weitere Kandidaten (SummaryCard, ActivityPanel, Skeleton-/Panel-Layouts) sind dokumentiert und können bei Bedarf in späteren Iterationen in `shared-ui` überführt werden.

## Ticket 5: Gemeinsame Hooks/Types in Shared-Pakete auslagern

- **Beschreibung:** Logik und Typen identifizieren, die in beiden Frontends genutzt werden (z.B. Typen für Skeets/Kampagnen, ggf. Timeline-Hooks) und in ein oder mehrere Shared-Pakete auslagern (z.B. `packages/shared-logic`, `packages/shared-types`).
- **Ergebnis:** Beide Apps importieren diese Hooks/Types nur noch aus den Shared-Paketen und nicht voneinander.
- **Priorität:** Mittel
- **Aufwand:** M

### Erste Kandidaten für Ticket 5

- `useClientConfig` (Client-Konfiguration vom Backend)
  - Dashboard: `dashboard/src/hooks/useClientConfig.js`  
    - liefert `{ config, loading, error }` und liest u. a.:
      - `config.timeZone`
      - `config.platforms.mastodonConfigured`
      - `config.gifs.tenorAvailable`
      - `config.images.*` (Upload-Policy)
      - `config.polling.*` (Skeets/Threads, Heartbeat, Backoff, Jitter)
  - Bluesky-Client: `bsky-client/src/hooks/useClientConfig.js`  
    - liefert `{ clientConfig }` aus `/api/client-config` via SWR und wird z. B. genutzt für:
      - `clientConfig.search.advancedPrefixes` (Suche)
      - `clientConfig.gifs.tenorAvailable` (Tenor-GIFs im Composer)
  - Gemeinsames Ziel:
    - Eine plattformagnostische Implementierung von `useClientConfig` in einem Shared-Paket (z.B. `packages/shared-logic`) bereitstellen,
    - mit klar dokumentierter Config-Shape (`timeZone`, `platforms`, `gifs`, `images`, `polling`, `search`),
    - so dass sowohl `dashboard` als auch `bsky-client` dieselbe Datenquelle und Typdefinition verwenden.

Weitere Kandidaten (z.B. gemeinsame Typen für Skeets/Threads oder einfache Hilfsfunktionen für Polling/Backoff) werden nach Bedarf ergänzt, sobald konkrete Überschneidungen identifiziert sind.

## Ticket 6: `dashboard` von `bsky-client` entkoppeln (Abhängigkeit entfernen)

- **Beschreibung:**
  - In `dashboard/package.json` die Abhängigkeit `"bsky-client": "workspace:*"` entfernen.
  - In `dashboard/src/App.jsx` den dynamischen Import `React.lazy(() => import('bsky-client'))` und alle direkten Verwendungen entfernen.
  - Anstelle dessen eigene Dashboard-Komponenten plus die Shared-Komponenten verwenden, um die bisherigen Use-Cases abzubilden.
- **Ergebnis:** `dashboard` lässt sich starten, bauen und nutzen, ohne dass `bsky-client` als Abhängigkeit eingebunden ist.
- **Priorität:** Sehr hoch
- **Aufwand:** M
- **Status:** Erledigt (Abhängigkeit/Imports entfernt)

## Ticket 7: Eigenes Routing/Navigation im `dashboard` definieren

- **Beschreibung:** Unabhängiges Routing-/Navigationskonzept für das `dashboard` definieren (z.B. Tabs oder Seiten für die Bereiche, die bisher indirekt über den eingebetteten `bsky-client` abgebildet wurden).
- **Ergebnis:** Die wichtigsten User-Flows im `dashboard` sind klar strukturiert und nicht mehr vom Routing des `bsky-client` abhängig.
- **Priorität:** Mittel
- **Aufwand:** M

## Ticket 8: Build- und Dev-Setup für getrennte Frontends aufräumen

- **Beschreibung:** `package.json`-Scripts, `docker-compose` und ggf. `README.md` aktualisieren, sodass klar ist, wie `dashboard` und `bsky-client` jeweils separat entwickelt, gebaut und deployed werden.
- **Ergebnis:** Eindeutige Kommandos pro App (z.B. `npm run dev:frontend`, `npm run dev:bsky-client`) und keine implizite Kopplung mehr zwischen den Frontends.
- **Priorität:** Mittel
- **Aufwand:** S–M

## Ticket 9: Regression-Check & Monitoring nach Entkopplung

- **Beschreibung:** Nach der Entkopplung manuelle Tests (oder vorhandene E2E-Tests) der wichtigsten Flows durchführen, die zuvor über den eingebetteten `bsky-client` liefen. Auffälligkeiten als eigene Issues erfassen.
- **Ergebnis:** Checkliste der geprüften Use-Cases und ggf. neue Issues für entdeckte Lücken oder Bugs.
- **Priorität:** Hoch
- **Aufwand:** S–M
