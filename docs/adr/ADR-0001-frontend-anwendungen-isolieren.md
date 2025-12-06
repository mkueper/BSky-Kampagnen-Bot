# ADR-0001: Frontend-Anwendungen isolieren

**Status:** Geplant  
**Datum:** 2025-12-06  

## Kontext

- Das `dashboard` lädt die `bsky-client`-Anwendung direkt als React-Komponente (dynamischer Import via `React.lazy(() => import('bsky-client'))`).
- In `dashboard/package.json` besteht eine direkte Abhängigkeit auf das `bsky-client`-Paket (`"bsky-client": "workspace:*"`).
- Beide Frontend-Anwendungen sind damit eng gekoppelt: Änderungen im `bsky-client` können das `dashboard` brechen (und umgekehrt), Deployments sind schwer entkoppelbar und die Projektstruktur ist unklar.
- Es gibt bereits eine Analyse der Probleme und Refactoring-Ideen in:
  - `docs/refactoring/analyzed/architektur-bugs.md`
  - `docs/refactoring/analyzed/architektor-vorschlaege.md`
- Konkrete Refactoring-Tickets für die Entkopplung sind in `docs/refactoring/planned/frontend-isolation-tickets.md` beschrieben.

## Entscheidung

1. `dashboard` und `bsky-client` werden als zwei eigenständige Frontend-Anwendungen betrachtet und weiterentwickelt.
2. Es werden **keine direkten App-zu-App-Imports** mehr erlaubt (z.B. `dashboard` importiert keine Komponenten oder Logik direkt aus `bsky-client` und umgekehrt).
3. Gemeinsame Funktionalität (UI-Komponenten, Hooks, Types etc.) wird in dedizierte Shared-Pakete unter `packages/` ausgelagert (z.B. `packages/shared-ui`, `packages/shared-logic`, `packages/shared-types`).
4. Beide Frontends konsumieren ausschließlich:
   - das gemeinsame Backend (HTTP-/API-Schnittstellen) und
   - die Shared-Pakete aus `packages/`, nicht aber die jeweils andere App.
5. Das `dashboard` erhält ein eigenes, klares Routing- und Navigationskonzept und rendert keine komplette zweite App mehr in sich.

Diese Entscheidung wird schrittweise über die Tickets in `docs/refactoring/planned/frontend-isolation-tickets.md` umgesetzt.

## Konsequenzen

**Positive:**

- Bessere Isolation: Änderungen am `bsky-client` beeinträchtigen das `dashboard` deutlich seltener (und umgekehrt).
- Klarere Verantwortlichkeiten: `dashboard` und `bsky-client` haben jeweils einen eigenen Scope; gemeinsam genutzter Code ist explizit in Shared-Paketen organisiert.
- Verbesserte Wartbarkeit: Frontends können unabhängig voneinander refaktoriert, getestet und deployed werden.
- Besserer Überblick: Die Struktur im Monorepo (Workspaces, Shared-Pakete) spiegelt die Fachdomäne und die technischen Grenzen klarer wider.

**Negative/Nebenwirkungen:**

- Kurzfristig zusätzlicher Aufwand für das Extrahieren und Bereinigen von gemeinsam genutzter Logik und UI-Komponenten.
- Eventuell müssen Workflows von Nutzer:innen angepasst werden, wenn bisher `dashboard`-Ansichten direkt auf `bsky-client`-Routing/-Logik aufbauten.
- Mehr Pakete im Monorepo bedeuten zusätzliche Pflege (Versionierung, Tests, Dokumentation) – allerdings bei klareren Grenzen.

## Regeln für Shared-UI-Komponenten

- Shared-UI-Pakete (insb. `@bsky-kampagnen-bot/shared-ui`) enthalten ausschließlich **präsentationsorientierte** Bausteine:
  - visuelle Komponenten (Buttons, Cards, Modals, Layout-Helfer, Theme-Toggle, Toaster),
  - UI-nahe Hooks (`useToast`, `useThemeMode`) und
  - Theme-Konfiguration/Provider (`ThemeProvider`, `THEMES`, `THEME_CONFIG`, `DEFAULT_THEME`).
- Shared-UI-Komponenten enthalten **keine** fachliche Geschäftslogik:
  - keine direkten API-Calls,
  - kein Zugriff auf app-spezifische Hooks wie `useSkeets`, `useThreads`, `useSession` usw.
- Jede geteilte UI wird als Editor/Presenter entworfen:
  - Steuerung ausschließlich über Props (`value`, `onChange`, `onSubmit`, `mode`, `errors`, `isBusy` etc.),
  - Entscheidungen, was mit den Daten passiert (Planen vs. Sofort senden, Statuswechsel), treffen die Container in den jeweiligen Apps.
- Layout-/Frame-Komponenten auf App-Ebene (z.B. komplette Seiten unterhalb von `<main>`) bleiben in `dashboard` bzw. `bsky-client` und werden nicht in Shared-Pakete verschoben.
- Shared-UI-Komponenten sind **plattformagnostisch** und werden explizit so gestaltet, dass sie in mehreren Clients (z.B. Dashboard, Bluesky-Client, Mastodon-Client, zukünftige UIs) wiederverwendbar sind.

## Bezüge

- Analysen:
  - `docs/refactoring/analyzed/architektur-bugs.md`
  - `docs/refactoring/analyzed/architektor-vorschlaege.md`
- Refactoring-Plan:
  - `docs/refactoring/planned/frontend-isolation-tickets.md`
