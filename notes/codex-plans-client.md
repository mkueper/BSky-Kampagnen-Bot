# Codex Plan – BSky Client / Trennung vom Kampagnen‑Tool

---

## 1. Datum (TT.MM.JJJJ)

05.01.2026

## 2. Status (aktueller Stand, keine ToDos)

- `bsky-client` läuft losgelöst vom Kampagnen-Backend: Auth, Timelines, Notifications und Suche sprechen direkt mit `@atproto/api`, Multi-Account-Switch bleibt stabil.
- Timeline-/Mitteilungs-Tabs merken sich Scroll-Positionen, springen nur bei echten Refreshes nach oben und zeigen neue Inhalte per Badge/ScrollTop-Button an, ohne die Liste zweimal zu rendern.
- Composer, Medien-Rendering und Profile-Pane unterstützen jetzt reservierte Layouts (keine Sprünge beim Bild-Laden) sowie kontextsensitive Hover/Badges in Sidebar/Nav-Bar.
- Suche: Präfix-Auswahl läuft per Hints direkt im Eingabefeld, Keyboard-Navigation/Enter fügt Prefixe zuverlässig ein und der klare „Eingabe löschen“-Button ist immer zugänglich.
- Notification-Badges werden konstant aktualisiert, auch wenn die Notifications-Sektion nicht aktiv ist; `useNotificationPolling` trennt Badge-Counts von Snapshot-/Has-New-Abrufen und der Service-Orchestrator hält die Hook-Flags konsistent (`ClientServiceOrchestrator`, `docs/code-review-bsky-client.md`).
- `AppContext` ist in Sub-Provider (`Timeline`, `Composer`, `Thread`, `UI`) aufgeteilt; `guardedDispatch` bleibt gezielt und globaler State ist schlanker.
- `SectionRenderer` startet kein Polling mehr, die Service-Logik läuft zentral im `ClientServiceOrchestrator`.
- Die Action-Dispatch-Matrix in `docs/code-review-bsky-client.md` ist gepflegt; Tests decken Badge- vs. Snapshot-Polling-Flows ab.
- Testsuite und Pre-Commit-Lint/Build laufen regelmäßig durch; bekannte Warnungen (`AppProvider`-Dispatch, `@atproto/lex-data` Ponyfills, Backend-Logging `EACCES`, Chunk-Size-Meldung beim `vite build`) sind dokumentiert.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Badge-Polling ist abgekoppelt, der Service-Layer steuert Hooks zentral, und die Dokumentation reflektiert den aktuellen Zustand. Der nächste Fokus liegt auf Provider-Aufspaltung und klaren UI/Service-Grenzen bei neuen Sections.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

Derzeit keine offenen Schritte definiert.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- `useNotificationPolling` trennt Badges (`fetchUnreadNotificationsCount`) von Snapshot-/Has-New-Logiken und läuft nur bei den jeweils nötigen Flags.
- `ClientServiceOrchestrator` versorgt alle Services mit den richtigen Aktivitäts- und Badge-Parametern, `SectionRenderer` bleibt Polling-frei.
- Tests und Pre-Commit-Checks (Lint + `vite build`) wurden zuletzt vollständig ausgeführt.

## 6. Offene Fragen (keine Tasks)

- Der Client bleibt dauerhaft standalone-first (direkt `@atproto/api`), kann aber optional wieder in das Dashboard eingebettet werden (z. B. via WebView). Shared-Komponenten/Utilities müssen bewusst paketneutral bleiben, um spätere Consumers (Mastodon-Client etc.) zu ermöglichen.
- Bei Sprachsuchen (z. B. `searchPosts`) können optionale Sprachfilter gesetzt werden; merken, welche Sprachen zuletzt genutzt wurden.
- Beim Modus "Post zitieren" sollten wir den zitierten Beitrag unterhalb der Texteingabe anzeigen (ggf. direkt unter der Buttonzeile), damit die Vorschau wie in der offiziellen App wahrgenommen wird.
- UI-Layer möglichst konsequent mit Radix-Komponenten lösen (Select, Popover, Dialog etc.), statt weitere Eigenlösungen zu bauen.
- **Unroll-Erweiterung:** Wenn die Trennlinie gesetzt ist, Footer mit Reply/Like/Repost/Zitat unter jedem Beitrag anzeigen; außerdem einen Übersetzungsbutton im Unroll-Header vorbereiten, der beim Klick alle enthaltenen Beiträge übersetzt und so schnell Kontext liefert.
