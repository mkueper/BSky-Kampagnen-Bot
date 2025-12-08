# Codex Plan – BSky Client / Trennung vom Kampagnen‑Tool

---

## 1. Datum (TT.MM.JJJJ)

07.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Der `bsky-client` läuft wieder stabil gegen das Backend (Proxy auf Port 3000), Layout/Theme und Typografie sind an das Dashboard angepasst (`ThemeProvider`, Tailwind‑Tokens, Fonts).
- Login‑Flow, Timeline, Header/Navigation und grundlegende Interaktionen sind im `bsky-client` implementiert, die Kampagnen‑Funktionalität liegt vollständig im Dashboard/Backend.
- Die wichtigsten Backend‑Abhängigkeiten des `bsky-client` sind identifiziert (Auth, `/api/me`, Bluesky‑Proxies, Uploads, Tenor‑Proxy, Client‑Config).
- `shared-ui` und `shared-logic` dienen bereits als zentrale Brücke für gemeinsame UI‑Bausteine und Logik zwischen Dashboard und Client.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Der `bsky-client` ist funktional vom Kampagnen‑Tool getrennt (keine Scheduler-/Cron-/Settings‑Screens), nutzt aber noch das gleiche Backend für Auth und Bluesky‑Aktionen. In der nächsten Session soll die Trennung im Code weiter geschärft werden (klare Import‑ und API‑Boundary) und eine Grundlage geschaffen werden, um später optional einen echten Standalone‑Modus (direkt gegen `@atproto/api`) ergänzen zu können.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Import‑Grenzen absichern:
   - Im `bsky-client` alle Imports auf `bsky-client/src/**` und `packages/*` begrenzen; sicherstellen, dass es keine direkten Imports aus `backend/**` oder `dashboard/**` gibt (ggf. kleine ESLint‑Regel oder Projekt‑Konvention ergänzen).

2. API‑Abhängigkeiten sichtbar machen:
   - Alle aktuellen `/api/...`‑Aufrufe im `bsky-client` zentral dokumentieren (Auth/Session, `/api/me`, `/api/bsky/*`, `/api/uploads/*`, `/api/tenor/*`, `/api/client-config`) und im Code klar als „Backend‑Proxy für Bluesky“ kennzeichnen.

3. Client‑Modi vorbereiten:
   - Ein Konfigurationsflag entwerfen (z. B. `VITE_CLIENT_MODE=backend|standalone`), das langfristig zwischen „Backend‑Modus“ (heutiges Verhalten) und „Standalone‑Modus“ (direkte Bluesky‑API) unterscheiden kann, ohne das UI zu verzweigen.

4. Config sauber trennen:
   - In `.env.sample` die Blöcke für Backend/Kampagnen‑Tool vs. `bsky-client` klarer labeln (Ports, VITE‑Variablen), damit künftige Missverständnisse bei Port‑ und Modus‑Konfiguration vermieden werden.

5. README/Developer‑Hinweis:
   - Kurz dokumentieren, dass `bsky-client` und Dashboard getrennte Frontends sind, die nur über `shared-ui`/`shared-logic` verbunden sind, und wie man jeden Teil im Dev‑Modus startet (`dev`, `dev:frontend`, `dev:bsky-client`).

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Im `bsky-client` existieren keine direkten Imports aus `backend/**` oder `dashboard/**`; alle geteilten Bausteine kommen aus `packages/*`.
- Jede Stelle, die `/api/...` nutzt, ist eindeutig einem der bekannten Backend‑Endpunkte zugeordnet und als solche erkennbar dokumentiert.
- Ein (noch einfacher) Schalter für einen zukünftigen „Standalone‑Modus“ ist vorbereitet, ohne aktuelles Verhalten zu verändern.
- `.env.sample` und ggf. README erläutern klar, welche Ports und Variablen für Backend/Kampagnen‑Tool vs. `bsky-client` relevant sind.

## 6. Offene Fragen (keine Tasks)

- Soll der `bsky-client` mittelfristig einen vollständigen Standalone‑Modus bekommen, der ohne Backend direkt gegen Bluesky (`@atproto/api`) arbeitet, oder soll der Backend‑Proxy die primäre Betriebsart bleiben?
- Welche Features des heutigen `bsky-client` sind für einen Standalone‑Modus wirklich essentiell (Timeline, Profil, Notifications, Interaktionen) und welche bleiben bewusst Backend‑gebunden (z. B. Upload‑Proxy, Tenor‑Proxy)?
- Wie stabil und öffentlich soll `shared-ui` perspektivisch werden (nur internes Monorepo‑API oder eigenständig versionierte Bibliothek, die auch von einem ausgelagerten Client genutzt werden kann)?

