# Unreleased Notes

## 2025-11-24

### Backend
- **Improvement:** Die Bluesky-Timeline-Logs enthalten bei 500ern nun Status, Cursor und Response-Ausschnitte – die Suche nach „Lexicon not found“ liefert statt eines generischen 500 jetzt ein klarer 501 mit Hinweis, falls `app.bsky.feed.searchFeedGenerators` nicht verfügbar ist.
- **Feature:** Logging-Setup versteht Legacy-Targets wie `LOG_TARGET=logfile`, unterstützt Dateirotation via `LOG_MAX_BYTES` (max. 100 MB) und `LOG_MAX_BACKUPS` und deckt das Verhalten durch neue Vitest-Cases ab.
- **Feature:** `config/app-customization.json` bündelt erlaubte Medien-Domains für die CSP sowie Advanced-Search-Prefixes; der Server liest die Datei (bzw. `APP_CUSTOMIZATION_PATH`) und liefert die Werte über `/api/client-config` an das Dashboard.
- **Feature:** Neuer Proxy `GET /api/bsky/blocks` ruft `app.bsky.graph.getBlocks` auf, normalisiert die Profile (stabile `listEntryId`, Beschreibung, Avatar) und liefert Cursor/Pagination an den Client.

### Client
- **Bugfix:** Die Timeline blockt doppelte Keys beim Nachladen; Cursor-Wechsel beim Tab-Switch verhindert die zuvor sporadischen 500er nach „Discover → Following“.
- **Improvement:** Das Kontextmenü eines Skeets orientiert sich an der offiziellen Bluesky-App („Übersetzen“, „Mehr/Weniger davon anzeigen“, „Thread/Wörter stummschalten“, „Post ausblenden“, „Account stummschalten/blockieren“, „Post melden“).
- **Improvement:** Die Suche liest die konfigurierbaren Advanced-Prefixes vom Backend; sobald ein solcher Filter (`from:`, `mention:`, `domain:` …) verwendet wird, bleiben nur noch die Tabs „Top“ und „Neueste“ aktiv.
- **Feature:** Navigationspunkt „Blockliste“ (Sidebar & Mobile) zeigt alle Accounts, die du blockierst; die Karten enthalten Profil-Link und „Mehr laden“-Pagination über den neuen Backend-Proxy.
- **Feature:** Hashtags im RichText öffnen per Linksklick ein Menü mit Aktionen wie „#…-Posts ansehen“; die Treffer erscheinen anschließend in einem eigenen Modal (Tabs „Top/Neueste“), das die bestehenden Timeline-Komponenten inkl. Reply/Quote/Media-Lightbox nutzt.
- **Change:** Der Feed-Tab wurde vorübergehend entfernt, bis Bluesky eine offizielle Feed-Such-API anbietet. So vermeiden wir die bisherigen Fehlermeldungen beim Abruf.
- **Improvement:** Profilansicht zeigt jetzt Relationship-Badges „Blockiert“ und „Blockiert dich“, sobald die Bluesky-API dies meldet – analog zur offiziellen App.

## 2025-11-23

### Client
- **Refactor UI:** Timeline-Aktionsleisten (Teilen, Optionen, Reskeet) nutzen jetzt Radix-basierte Popover-Menüs: Link kopieren, Direktnachricht-Platzhalter und Embed sind sauber gruppiert, das Optionsmenü bleibt zugänglich und das Repost-Menü bietet explizite Einträge für Reposten bzw. Reskeet zurückziehen. Die Komponenten liegen als `InlineMenu` im Shared-UI und stehen damit auch dem Dashboard offen.
- **Refactor UI:** - QuickComposer entfernt – der „Neuer Post“-Button öffnet wieder ausschließlich den vollwertigen Composer, sodass sämtliche Features nur noch an einer Stelle gepflegt werden müssen.
- **Bugfix:** Likes/Reposts werden nach einer Aktion sofort konsistent angezeigt. Der `useBskyEngagement`-Hook wertet jetzt `recordUri`-Fallbacks aus, unterstützt sowohl `likeCount` als auch `likesCount` und synchronisiert seine Viewer-Daten über den neuen `/api/bsky/reactions`-Payload.
- **UI:** Der Reskeet-Button öffnet auch nach einem erfolgreichen Reskeet weiterhin das Menü mit „Reskeet zurückziehen“ und „Post zitieren“, statt die Aktion direkt auszuführen. So lassen sich versehentliche Rücknahmen vermeiden.
- **Feature:** Bookmarks sind nun direkt im Client verfügbar: Jeder Skeet hat einen „Merken“-Button mit Radix-Icon, und der Navigationspunkt „Gespeichert“ zeigt eine eigene Liste (inkl. Infinite Scroll) der gespeicherten Beiträge.
- **Bugfix:** Likes und Reskeets bleiben nach dem Ausführen sichtbar. Die jeweiligen Buttons liefern ihre neuen Zähler/Viewer-States an Timeline, Suche, Profile und den Gespeichert-Feed zurück, sodass die UI nicht mehr kurzzeitig zurückfällt.
- **Bugfix:** React-Keys & Engagement-Updates nutzen eine serverseitige `listEntryId`, wodurch doppelte Einträge (z.B. Selbst-Quotes) nicht mehr kollidieren und die Status-Anzeige immer dem richtigen Karten-Exemplar zugeordnet wird.
- **Bugfix:** Auch die Mitteilungs-Liste verwendet die `listEntryId`, damit gruppierte oder mehrfach auftretende Notifications nicht mehr doppelt dargestellt werden.

### Backend
- **Refactor:** Unnötigen `quickComposer`-UI-Schalter aus Config/Client-Config entfernt; `/api/client-config` liefert nur noch tatsächlich genutzte UI-Flags.
- **Bugfix:** Die Bluesky-Aktionsendpunkte (`like`, `repost`, `unlike`, `unrepost`) geben den erzeugten Record-URI zurück und setzen den Viewer-Status direkt, während `/api/bsky/reactions` neben den Zählern nun auch den aktuellen Viewer (`like`/`repost`) ausliefert. Damit bleiben Timeline und Mitteilungen nach Engagement-Aktionen synchron.
- **Feature:** Bookmarks werden unterstützt: neue Endpunkte (`POST/DELETE /api/bsky/bookmark`, `GET /api/bsky/bookmarks`) kapseln die Bluesky-Bookmark-API und liefern gespeicherte Beiträge in demselben Format wie die Timeline.
- **Improvement:** Alle Timeline-/Profil-/Bookmark-Feeds liefern zusätzlich eine stabile `listEntryId`, sodass der Client jeden Postkontext eindeutig referenzieren kann (z.B. Zitat vs. Original).
- **Improvement:** Das Mitteilungs-Endpoint gibt dieselbe `listEntryId` aus, sodass Gruppenbenachrichtigungen und Einzelereignisse stabil adressiert werden können.

### Docs
- **Refactor UI:** README & `.env.sample` bereinigt (QuickComposer-Variablen gestrichen).

## 2025-11-22

### Client
- **Bugfix:** Ein Absturz in der Mitteilungsansicht wurde behoben, der durch einen fehlenden Import des `useMediaLightbox`-Hooks verursacht wurde.
- **Refactor:** Die Komponenten des Clients (`Timeline`, `Notifications`, `ProfileView`, `SearchView`, `ThreadView`) wurden umfassend überarbeitet. Anstatt vieler Eigenschaften (Props) beziehen sie ihre Daten und Funktionen nun zentral aus dem `AppContext` über Hooks (`useComposer`, `useThread`, `useMediaLightbox`). Dies reduziert die Komplexität, entkoppelt die Komponenten und vereinfacht die Wartung.
- **UI:** Das responsive Verhalten der Seitenleiste wurde für mittelgroße Bildschirme (Tablets) verbessert, indem der Haltepunkt von `xl` auf `lg` geändert wurde.
- **Refactor:** Die Funktion `parseAspectRatioValue` liegt nun zentral in `shared/utils/media`. Timeline, Notifications und Media-Lightbox greifen gemeinsam darauf zu, sodass Anpassungen an einer Stelle genügen.
- **Bugfix:** Der Composer verhindert nach dem vierten Anhang weitere Uploads, bevor Requests gestartet werden; der Fokus springt nach Bild/GIF wieder zuverlässig in die Textarea.
- **Refactor:** Die Kernkomponenten des Clients (`Timeline`, `Notifications`, `ThreadView`, `SearchView`, `ProfilePosts`) wurden umfassend refaktoriert. Sie beziehen ihre Daten und Funktionen nun direkt aus dem App-Kontext über Hooks, anstatt sie über Props zu erhalten. Dies reduziert die Komplexität und verbessert die Wartbarkeit. Die dazugehörigen Tests wurden ebenfalls an diese neue Architektur angepasst.
- **UI:** Der responsive Breakpoint für die Anzeige der breiten Sidebar wurde von `xl` auf `lg` reduziert.

## 2025-11-21

### Backend
- **Bugfix:** Uploads, die als Data-URL via JSON eingehen, respektieren jetzt `UPLOAD_MAX_BYTES` und liefern bei zu großen Payloads HTTP 413 statt 400. Gleichzeitig wurde die Validierung für Multer-basierte Uploads gehärtet.

### Client
- **Improvement:** Die Thread-Ansicht merkt sich eine kleine Verlaufshistorie. Beim Schließen springt der Nutzer nun zuverlässig zum zuvor geöffneten Beitrag zurück.
- **Bugfix:** Profil-Tabs (Beiträge/Antworten/Medien) laden nach einem Fehler wieder korrekt nach, wenn der Benutzer „Erneut versuchen“ wählt.
- **Bugfix:** Die Suche verhindert, dass verspätete `loadMore`-Antworten Ergebnisse eines alten Queries anfügen.
- **Bugfix:** Die Media-Lightbox hält die React-Hook-Reihenfolge stabil, selbst wenn vorübergehend kein Medium vorhanden ist – Warnungen/Memory-Leaks bleiben aus.
- **UI:** Videokacheln in Timeline und Mitteilungen nutzen jetzt das angegebene Seitenverhältnis; Poster und Fallbacks teilen sich dieselben Maße wie Bildvorschauen und blocken Pointer-Events sauber.

## 2025-11-19

### Backend
- **Bugfix:** Ein Fehler wurde behoben, bei dem die Zählung von Likes/Reposts inkonsistent war. In der gesamten Anwendung wird nun einheitlich die Struktur `{ likesCount: number, repostsCount: number }` verwendet, anstatt eines Mix aus Zählern und Arrays. Dies korrigiert einen fehlschlagenden Test in `bskyApi.test.js` und stabilisiert die Datenverarbeitung in `engagementService` und `threadEngagementService`.
- **Refactoring:** Der `bskyController` wurde korrigiert, um die korrekten Zähler für Reaktionen in der API-Antwort zurückzugeben.

### Client
- Der `useBskyEngagement`-Hook wurde angepasst, um die vereinheitlichten `likesCount`- und `repostsCount`-Werte vom Backend korrekt zu verarbeiten und darzustellen.
- **Feature:** Medien (Bilder/Videos) in Antwort-Benachrichtigungen werden nun direkt in der Mitteilungsansicht als Vorschau angezeigt und können in der Lightbox geöffnet werden.
- **Bugfix:** Eine React-Warnung wegen doppelter Schlüssel (`duplicate key`) in der Mitteilungsliste wurde behoben. Gruppierte Benachrichtigungen (z.B. mehrere Likes) erhalten nun einen stabilen, einzigartigen Schlüssel, was das Rendering effizienter und fehlerfrei macht.
- **Feature:** Antwort-Benachrichtigungen zeigen nun direkt im Footer die Anzahl der Likes, Reposts und Antworten an. Die Daten werden effizient im Backend abgerufen, um das Frontend zu entlasten.
- **Bugfix:** Der Interaktionsstatus (Like/Repost) in Mitteilungen bleibt nun nach einem Refresh erhalten. Die API gibt nach einer Aktion den aktualisierten `viewer`-Status zurück, der im Frontend korrekt synchronisiert wird.

## 2025-11-18

### Client
- Notifications erhalten eine Test-Suite für Render-/Filterlogik und wichtige Interaktionen (Mark-as-read, Reply/Quote, Profilviewer, Media-Lightbox, Systemhinweise); `NotificationCard` wird dafür separat exportiert.
- Medienvorschau und Lightbox des Bluesky-Clients unterstützen jetzt auch eingebettete Videos in Mitteilungen, inklusive Poster-Preview und Steuerung direkt im Overlay.
- Timeline, Thread-View und Media-Lightbox reichen eingebettete Videos mitsamt Poster/Index an den Viewer durch; HLS-Streams laufen dank `hls.js`-Fallback auch in Browsern ohne native `.m3u8`-Unterstützung.
- Videovorschauen in Notifications/Timeline respektieren nun die Card-Config-Dimensionen (z.B. `singleMax`), sodass Poster und Platzhalter dieselbe Höhe/Breite wie Bilder besitzen.
- MediaLightbox erhielt visuelle/UX-Feinschliff: Overlay blockiert nicht länger Pointer-Events außerhalb des Inhalts, der Rand ist heller und Alt-Texte brechen exakt auf Medienbreite um.
- Profilansicht überarbeitet: Caching für Beiträge/Antworten/Medien-Tabs verhindert unnötiges Neuladen.
- Skeleton-Loader für Profil-Header und Beitragsliste verbessern die wahrgenommene Ladezeit.
- Fehlerbehandlung in der Profilansicht um einen „Erneut versuchen“-Button erweitert.
- Die `ProfilePosts`-Komponente wurde in eine eigene Datei ausgelagert, um die Code-Struktur zu verbessern.
- Lade-Flickern beim Öffnen eines Profils behoben, indem der Suspense-Fallback nun ebenfalls einen Skeleton-Loader (`ProfileMetaSkeleton`) verwendet.
- Die Profil-Vorschau (`ProfileCard`) zeigt beim Laden nun einen Skeleton-Platzhalter anstelle eines einfachen Textes.
- Profilvorschau-Badges zeigen „Folgt dir“ nur noch bei korrekt gemeldeter Gegenbeziehung (`viewer.followedBy`), nicht mehr beim eigenen Follow.
- Infinite Scroll der Profil-Feeds stoppt nach Fehlern und bietet einen manuellen „Erneut versuchen“-Button direkt unter der Liste.
- Der Profil-Viewer nutzt einen synchron importierten Skeleton-Fallback, damit das Modal sofort einen Platzhalter rendert, während `ProfileView` lädt.
- Eingebettete Tenor-/GIF-Links werden wie native Medien geöffnet und landen im integrierten Media-Lightbox statt im neuen Browser-Tab.
- Mitteilungen heben Antworten deutlich hervor, bringen ihre Medien-Previews in die Lightbox und ignorieren unverlinkte Follow-Karten beim Thread-Öffnen; Likes/Reskeets/Quotes bleiben nutzbar.
- Blaues „Threadviewer“-Overlay zeigt in den Mitteilungen denselben Header wie in der Timeline – inklusive sauberem Escape selbst bei Fehlermeldungen.
- Theme-Umschaltung sitzt jetzt direkt in der Sidebar bzw. im mobilen Bottom-Nav und schaltet zwischen Hell → Gedimmt → Dunkel → Mitternacht.
- Theme-Umschaltung in der Sidebar verfeinert: Ein kleiner Indikator-Punkt zeigt eine Vorschau der nächsten Theme-Farbe, ohne das Button-Design zu verändern. Button-Größen wurden vereinheitlicht und ein Trenner verbessert die visuelle Struktur.
- Card-Config-Defaults auf 256px / 128px reduziert und in den Mitteilungen wiederverwendet, damit Bildhöhen in Timeline & Notifications identisch laufen.

## 2025-11-17

### Client
- Profilansicht zeigt jetzt direkt im Tab „Beiträge“ den öffentlichen Feed eines Actors, inklusive Nachladen über den bekannten Skeet-Renderer.
- Tab „Antworten“ nutzt ebenfalls den Author-Feed und filtert ausschließlich Replies heraus.
- Die Beitrags-/Antworten-Tabs bleiben beim Scrollen sticky sichtbar, sodass der Wechsel jederzeit möglich ist.
- Neuer Tab „Medien“ zeigt ausschließlich Beiträge mit Anhängen (Bilder/Videos), während „Videos“ als Platzhalter ausgewiesen ist.
- Wenn die Profil-Tabs sticky werden, erscheint ein kompakter Zurück-Button in der Leiste; ansonsten bleibt er wie zuvor im Hero-Bereich.
- Profilansicht überarbeitet: Banner + Avatar bilden jetzt ein zusammenhängendes Hero-Layout wie in der offiziellen Bluesky-App, inklusive neuer Aktionsleiste und Labels-Hinweis.
- Eigene Profile öffnen sich ebenfalls in der Modalansicht; mobile Darstellung nutzt ein randloses Overlay ohne dunklen Rahmen.
- Karten besitzen einen kompakteren Absatzabstand und der Profilhinweistext nutzt kleinere Typografie.

### UI / Shared
- `Card`-Komponente erhielt ein optionales `compact`-Preset plus neue Styles für reduzierte Leerzeilen.

## 2025-11-16

### Backend
- Neuer Endpoint `/api/bsky/profile/feed` liefert den Bluesky-Author-Feed (Posts/Replies) samt Cursor, damit der Client Profil-Beiträge anzeigen kann.
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
- QuickComposer entfernt – der „Neuer Post“-Button öffnet wieder ausschließlich den vollwertigen Composer, sodass sämtliche Features nur noch an einer Stelle gepflegt werden müssen.
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
