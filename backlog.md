# Backlog / Ideen

Dokumentiert offene oder geplante Aufgaben. Bitte bei Änderungen die Punkte zwischen den Phasen verschieben.

## Backlog
1. Skeet-/Thread-Planung: Vorschaukarten an Live-Timeline anlehnen (Autorzeile, Media-Preview) und Outline für lange Threads bereitstellen.
2. Weitere Advanced-Search-Prefixes evaluieren (z. B. `lang:`, `has:media`) und bei Bedarf in `app-customization.json` aufnehmen.
3. Prefixe können nicht nur am Anfang einer Suche stehen. Im Ergebnis nur die Tabs "Top" und "Neuste" anzeigen.
4. Suche im Content-Pane an das Timeline/Mitteilungen-Layout anpassen (einheitlicher Header/Zurück-Button/Tabs).

## In Progress

## Review
1. Beim Klicken in ein Suchergebnis soll der angeklickte Skeet in der Thread-Ansicht angezeigt werden. (Parent hochhangeln, bis zum ersten Post/Skeet)
2. Detail-Pane (Profil/Mitteilungen) soll den kompletten rechten Bereich inkl. Header überlagern, damit Timeline-Controls nicht sichtbar bleiben.

## Done

### 2025-11-25
- Thread-Lesefenster (Inline-Pane) ohne Reaktionen, Inhalte über `app.bsky.feed.getPostThread` laden, Text/Medien `user-select: none`.
- Thread-Unroll: „Unroll“-Button inklusive Modal zeigt bei eigenen Threads den Autor-Verlauf ohne Fremdantworten.
- Hashtags im RichText sind klickbar und öffnen ein Kontextmenü mit Aktionen (Posts anzeigen, Posts des Nutzers, Stumm-Option als Platzhalter).

### Vor 2025-11-25
- Feed-Tab der Suche ist deaktiviert, bis Bluesky eine offizielle Feed-Such-API bereitstellt (statt Fehlermeldungen).
- Composer setzt den Fokus direkt auf das Texteingabefeld.
- Media-Galerien (Timeline, Threads, Notifications) öffnen in der Lightbox.
- Reply-Mitteilungen zeigen Likes/Reposts/Replies inkl. aktueller Viewer-Daten.
- Konfigurierbare Medien-Domains & Such-Prefixes über `config/app-customization.json`.
- Such-Prefixes um "to:", "lang:", "since:" und "until:" ergänzt.
- NAV-Menü „Blockliste“ inkl. Proxy auf `app.bsky.graph.getBlocks`.
