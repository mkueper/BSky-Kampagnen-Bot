# Backlog / Ideen

Dokumentiert offene oder geplante Aufgaben. Bitte bei Änderungen die Punkte zwischen den Phasen verschieben.

## Backlog
- Skeet-/Thread-Planung: Vorschaukarten an Live-Timeline anlehnen (Autorzeile, Media-Preview) und Outline für lange Threads bereitstellen.
- Weitere Advanced-Search-Prefixes evaluieren (z. B. `lang:`, `has:media`) und bei Bedarf in `app-customization.json` aufnehmen.
- Prefixe können nicht nur am Anfang einer Suche stehen. Im Ergebnis nur die Tabs "Top" und "Neuste" anzeigen.

## In Progress
- Thread-Unroll: Wenn `record.reply.root.author` dem aktuellen Autor entspricht (eigener Thread), im Thread-Pane einen „Unroll“-Button anzeigen, der den Autor-Verlauf ohne Fremdantworten darstellt (inkl. Scrollposition/Startpost-Überlegung).

## Review
- Beim Klicken in ein Suchergebnis soll der angeklickte Skeet in der Thread-Ansicht angezeigt werden. (Parent hochhangeln, bis zum ersten Post/Skeet)

## Done
- Thread-Lesefenster (Inline-Pane) ohne Reaktionen, Inhalte über `app.bsky.feed.getPostThread` laden, Text/Medien `user-select: none`.

## Done
- Hashtags im RichText sind klickbar und öffnen ein Kontextmenü mit Aktionen (Posts anzeigen, Posts des Nutzers, Stumm-Option als Platzhalter).
- Feed-Tab der Suche ist deaktiviert, bis Bluesky eine offizielle Feed-Such-API bereitstellt (statt Fehlermeldungen).
- Composer setzt den Fokus direkt auf das Texteingabefeld.
- Media-Galerien (Timeline, Threads, Notifications) öffnen in der Lightbox.
- Reply-Mitteilungen zeigen Likes/Reposts/Replies inkl. aktueller Viewer-Daten.
- Konfigurierbare Medien-Domains & Such-Prefixes über `config/app-customization.json`.
- Such-Prefixes um "to:", "lang:", "since:" und "until:" ergänzt.
- NAV-Menü „Blockliste“ inkl. Proxy auf `app.bsky.graph.getBlocks`.
