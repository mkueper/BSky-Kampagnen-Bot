# Unreleased Notes

## 2025-11-17

### Client
- Profilansicht überarbeitet: Banner + Avatar bilden jetzt ein zusammenhängendes Hero-Layout wie in der offiziellen Bluesky-App, inklusive neuer Aktionsleiste und Labels-Hinweis.
- Eigene Profile öffnen sich ebenfalls in der Modalansicht; mobile Darstellung nutzt ein randloses Overlay ohne dunklen Rahmen.
- Karten besitzen einen kompakteren Absatzabstand und der Profilhinweistext nutzt kleinere Typografie.

### UI / Shared
- `Card`-Komponente erhielt ein optionales `compact`-Preset plus neue Styles für reduzierte Leerzeilen.

## 2025-11-16

### Backend
- Bluesky-Reaktionszahlen holen wir jetzt direkt über einen `getPostThread`-Call (wie im offiziellen Client), damit Likes/Reposts sofort korrekt aktualisieren und keine Rate-Limits durch massives Paging mehr auftreten.
- Alle Dashboard-/API-Routen (außer `/api/auth/*`) sind jetzt durch einen Admin-Login mit Scrypt-Hash + HttpOnly-Session-Cookie geschützt; `npm run tools:hash-password` hilft beim Generieren der Werte.

### Docs
- README & `.env.sample` beschreiben die neuen `AUTH_*` Variablen und das Hash-Tool für den Dashboard-Login.

## 2025-11-14

### Client
- Mobile Bottom-Navigation ist jetzt in eine freischwebende, abgerundete Leiste mit Safe-Area-Padding eingebettet; Floating-Compose und Scroll-Abstände passen sich automatisch an.
- Timeline-Tabs blenden den nativen Scrollbalken aus, das horizontale Scrollen erfolgt ausschließlich über die Pfeil-Buttons.
- Der ScrollTopButton sitzt auf Mobilgeräten dichter am linken Fensterrand und kollidiert nicht mehr mit dem Content.
- Theme-Umschaltung bietet jetzt zusätzlich ein „Gedimmtes“ dunkles Theme (zwischen Dunkel und Mitternacht) für Nutzer, die weniger Kontrast wünschen.
- Neuer `QuickComposer` erlaubt spontane Skeets direkt im Bluesky-Client; komplette Testsuite inklusive.
- `NewPostsBanner` zeigt frische Timeline-Einträge und verbindet Banner-Klick mit schnellem Refresh.
- Gemeinsamer `Button` lebt jetzt im Paket `@bsky-kampagnen-bot/shared-ui` und ersetzt die duplizierten Varianten in Client & Dashboard.
- Shared UI erweitert um `Modal`, `MediaDialog`, `ToastProvider` & `ScrollTopButton`; sowohl Dashboard als auch Bsky-Client nutzen die zentralen Komponenten.
- Media-Dialog zeigt gewählte Bilder sofort in der Vorschau und verhindert, dass Blob-URLs hängen bleiben.
- Composer im Bsky-Client verwendet den gemeinsamen Media-Dialog samt Alt-Text und Upload-Komprimierung.
- Notifications behandeln unbekannte `app.bsky.notification.*`-Reasons als Systembenachrichtigungen, statt sie neutral darzustellen.
- Überarbeiteter Feed-Manager mit eigenem Picker-Hook (`useFeedPicker`) für Anheften/Verwalten von Bluesky-Feeds.
- Notifications erhalten Tabs („Alle“/„Erwähnungen“) inklusive funktionierendem Thread-Open bei Like/Repost-Karten.
- Media-Dialog zeigt gewählte Bilder sofort in der Vorschau und verhindert, dass Blob-URLs hängen bleiben.
- Dashboard-Skeet-Form: Alt-Texte lassen sich bearbeiten/löschen, GIF-Upload nutzt Tenor-Proxy; Vorschau- und Remove-Buttons analog zum Thread-Planer.
- Push-Registrierung in `bsky-client` erhält einen konfigurierbaren Transport (Backend-Proxy per Default, Override via `configurePushTransport` oder globalem `window.__BSKY_PUSH_TRANSPORT__`), damit der Client auch ohne Backend direkt gegen Bluesky registrieren kann.
- Neuer „Einstellungen“-Bereich zeigt den aktiven Push-Transport an und erlaubt das manuelle Registrieren/Entfernen eines Tokens direkt aus der UI.
- Direkter Bluesky-Push-Transport über `@atproto/api` kann via `VITE_BSKY_PUSH_TRANSPORT=direct|auto` + `VITE_BSKY_DIRECT_IDENTIFIER`/`VITE_BSKY_DIRECT_APP_PASSWORD` (oder globaler `__BSKY_DIRECT_PUSH_CONFIG__`) genutzt werden; Fallbacks decken Backend-Proxy bzw. Noop ab.

### Backend
- Thread-Endpunkt akzeptiert jetzt `depth`/`parentHeight` und ruft `app.bsky.feed.getPostThread` mit höheren Limits auf – tiefe Verzweigungen werden vollständig geliefert.
- Tenor-Proxy bietet `/api/tenor/download` (Temp-Upload oder Base64) und wird in Dashboard/Client für GIFs genutzt.
- Content-Security-Policy erlaubt `blob:`-Bilder sowie Verbindungen zu Tenor/CDN.jsdelivr, damit GIFs/Emojis ohne CSP-Fehler laden.
- Neue Endpunkte `/api/bsky/notifications/register-push` & `/unregister-push` validieren Service-DID, Token & Plattform und rufen die Bluesky-APIs `app.bsky.notification.registerPush` bzw. `unregisterPush` auf.

### Docs
- `docs/research/bluesky-client-gap-analysis.md` dokumentiert offene Punkte im Bluesky-Client.
- `docs/research/bluesky-timeline-reference.md` fasst API-Referenzen und Beobachtungen zur Thread-/Timeline-Struktur zusammen.
- `docs/ui.md` aktualisiert: UI-Bausteine verweisen auf Shared-UI-Komponenten.

## 2025-10-29

### Client
- BSky-Client in Feature-Module und Shared-Layer aufgeteilt (Timeline, Notifications, Composer, Layout, Shared).
- Gemeinsamen API-Layer + Engagement-Hook eingefuehrt, inkl. automatischer Retry-Logik fuer Backend-Requests.
- Timeline-Tabs erhalten horizontale Scrollpfeile bei Overflow.
- Beitraege/Benachrichtigungen rendern Links kontextsensitiv (Bluesky-Profil intern, externe Links im neuen Tab).
- Reskeet-Schaltflaeche oeffnet ein Bestaetigungsmenue (Repost / Post zitieren) und bleibt im Sichtbereich.
- Hinweis auf neue Beitraege in der aktiven Timeline (Banner mit Schnell-Refresh).
- Benachrichtigungen fuer „Like via Repost“/„Repost via Repost“ zeigen den eingebetteten Original-Skeet inkl. Autor und Text.
- Suchansicht blendet bei Autor-Suchen (`from:`) die Tabs „Personen“ und „Feeds“ aus, damit nur relevante Ergebnislisten sichtbar bleiben.

### Backend
- Notifications-Endpoint resolved jetzt auch `record.subject`-URIs, aggregiert Mehrfach-Likes/Reposts pro Beitrag und liefert `additionalCount` fuer eine verdichtete Anzeige im Client.

## 2025-10-30

### Client
- Dashboard-Views und Formulare werden nun lazy geladen, wodurch das Initialbundle spuerbar schrumpft und Ladeindikatoren fuer jede Ansicht verfuegbar sind.
- Skeet- und Thread-Ansichten nutzen jetzt SSE-stabile Callbacks, respektieren View-basierte Aktivierung und virtualisieren umfangreiche Listen fuer fluedes Scrolling.
- Neue UI-Helfer (`useVirtualList`) synchronisieren Scroll-Container-Hoehen, so dass Floating-Toolbars samt „sichtbare aktualisieren“-Aktionen weiterhin korrekt funktionieren.
- Skeet- und Thread-Formulare wählen automatisch Bluesky+Mastodon vor, sobald eine Mastodon-Verbindung aktiv ist; Highlight-Snapping im Dashboard entfällt zugunsten weicherer Übergänge.
- Navigation und Mitteilungs-Header zeigen die Anzahl ungelesener Mitteilungen, inklusive periodischer Aktualisierung im Hintergrund.
- Bsky-Client lädt Suche und Mitteilungen nun per `React.lazy` und trennt React/Radix in eigene Rollup-Chunks – dadurch schrumpft das Initialbundle und sekundäre Bereiche werden erst bei Bedarf geladen.

### Backend
- Validation-Helfer fuer `scheduledAt` verzichten auf ungenutzte Catch-Argumente und bleiben damit ESLint-konform.
- Bluesky-Feed-Suche nutzt nun das offizielle `searchFeedGenerators`-API des `AtpAgent` (mit Fallback auf einen direkten XRPC-Call), womit „Cannot read properties of undefined (reading 'get')“ beim Tab „Feeds“ behoben ist.

# (automatisch geleert nach Release)
