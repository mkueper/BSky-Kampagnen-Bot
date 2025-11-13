# Unreleased Notes

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
- Bsky-Client lädt Such-/Mitteilungs-/Thread-Ansichten sowie Modals nun per `React.lazy`, ergänzt um manuelle Rollup-Chunks für React/Radix – dadurch schrumpft das Initialbundle und sekundäre Bereiche werden erst bei Bedarf geladen.

### Backend
- Validation-Helfer fuer `scheduledAt` verzichten auf ungenutzte Catch-Argumente und bleiben damit ESLint-konform.
- Bluesky-Feed-Suche nutzt nun das offizielle `searchFeedGenerators`-API des `AtpAgent` (mit Fallback auf einen direkten XRPC-Call), womit „Cannot read properties of undefined (reading 'get')“ beim Tab „Feeds“ behoben ist.

# (automatisch geleert nach Release)
