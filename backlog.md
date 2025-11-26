# Backlog / Ideen

Dokumentiert offene oder geplante Aufgaben. Bitte bei Änderungen die Punkte zwischen den Phasen verschieben.

## Backlog
1. Advanced-Search-Prefixes evaluieren (z. B. `lang:`, `has:media`) und ggf. in `app-customization.json` ergänzen.
2. Zentrale SWR-Einstellungen (Error-Boundaries/Logging) ergänzen und an globale `SWRConfig` anbinden.
3. Reducer-Logik im `AppContext` vereinfachen (z. B. strukturierte combineReducers-Variante).
4. Direkte DOM-Zugriffe (z. B. `getElementById`) durch React-Refs (`useRef`) ersetzen, damit Scroll-Container/Observer konsistent steuerbar sind.
5. Nachgeahmte Redux Muster durch Redux ersetzen (z,B, createSlice)
6. Action-Typen/String-Konstanten zentral definieren (z. B. `actions.js`) und überall nur noch diese Konstanten verwenden.
7.  Blockliste: Headertext „Alle Accounts, die du aktuell blockierst.“ auf „{count} Accounts werden blockiert.“ umstellen.
8.  Im eigenen Profil (oder der Profil-Viewer-Ansicht) soll ein Klick auf das eigene Profil nicht erneut den Viewer öffnen (self-view verhindern).
9. i18n-Texte perspektivisch aus JSON-Dateien laden (statt inline JS-Objekten), um spätere Locale-Erweiterungen zu vereinfachen.

## Feature-Kandidaten
1. Notifications-Filter: Konfigurationsbutton im Header mit echtem Filter-Overlay und speicherbarer Auswahl.
2. Chat-Pane: Chat-Ansicht inkl. Routing, Feed, Composer und Integration ins Layout.
3. Feeds-Sektion: Eigene Pane für Feed-Management/Explorer (Routing + Filter).
4. Listen-Verwaltung: Pane für das Anzeigen/Erstellen von Listen (inkl. Detailansichten).
5. Einstellungen erweitern: Konfigurationsbereich für weitere Optionen (z. B. Sprache, Notification-Filter, Experiment-Flags).
6. Einheitlicher Ladeindikator: Spinner-Slots in allen Pane-Headern anzeigen (auch beim initialen Laden), damit Refresh-Status und Skeletons konsistent erkennbar bleiben.

## In Progress
1. Internationalisierung vorbereiten: Texte zentral auslagern (z. B. i18n-Dateien) und UI-Komponenten darauf umstellen.

## Bugs
1. NAV-Badge für ungelesene Notifications aktualisiert sich erst nach dem Öffnen des Mitteilungs-Panels.

## Review
1. Pane-Routing über `react-router-dom` (HashRouter) weiter ausbauen (Nested Routes, Direktaufrufe für zukünftige Chats/Feeds).
2. NAV-Interaktionen sperren, wenn Detail-Panes (z. B. ContentPane) außerhalb der Hauptrouten geöffnet sind.
3. Weitere Feeds (Notifications, SavedFeed etc.) auf useSWRInfinite ziehen.
4. Beim Klicken in ein Suchergebnis soll der angeklickte Skeet in der Thread-Ansicht angezeigt werden. (Parent hochhangeln, bis zum ersten Post/Skeet)
5. Detail-Pane (Profil/Mitteilungen) soll den kompletten rechten Bereich inkl. Header überlagern, damit Timeline-Controls nicht sichtbar bleiben.
6. Suche im Content-Pane an das Timeline/Mitteilungen-Layout anpassen (einheitlicher Header/Zurück-Button/Tabs).

## Done

### 2025-11-26
- einen globalen SWRConfig Wrapper (z. B. in src/main.jsx) einführen, damit wir Default-Fetcher/Fehlerlogging zentral steuern können
- NAV-Interaktionen sperren, wenn Detail-Panes (z. B. ContentPane) außerhalb der Hauptrouten geöffnet sind.
  
### 2025-11-25
- Thread-Lesefenster (Inline-Pane) ohne Reaktionen, Inhalte über `app.bsky.feed.getPostThread` laden, Text/Medien `user-select: none`.
- Thread-Unroll: „Unroll“-Button inklusive Modal zeigt bei eigenen Threads den Autor-Verlauf ohne Fremdantworten.
- Hashtags im RichText sind klickbar und öffnen ein Kontextmenü mit Aktionen (Posts anzeigen, Posts des Nutzers, Stumm-Option als Platzhalter).
- Skeet-/Thread-Planung: Vorschaukarten an Live-Timeline angelehnt, Tabs synchron zu Timeline/Navigation.
- Prefixe können nicht nur am Anfang stehen – Such-Pane bleibt bei Präfix-Filtern auf "Top"/"Neuste".

### Vor 2025-11-25
- Feed-Tab der Suche ist deaktiviert, bis Bluesky eine offizielle Feed-Such-API bereitstellt (statt Fehlermeldungen).
- Composer setzt den Fokus direkt auf das Texteingabefeld.
- Media-Galerien (Timeline, Threads, Notifications) öffnen in der Lightbox.
- Reply-Mitteilungen zeigen Likes/Reposts/Replies inkl. aktueller Viewer-Daten.
- Konfigurierbare Medien-Domains & Such-Prefixes über `config/app-customization.json`.
- Such-Prefixes um "to:", "lang:", "since:" und "until:" ergänzt.
- NAV-Menü „Blockliste“ inkl. Proxy auf `app.bsky.graph.getBlocks`.
