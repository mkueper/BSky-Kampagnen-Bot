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

# (automatisch geleert nach Release)
