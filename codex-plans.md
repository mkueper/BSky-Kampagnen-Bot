1. Datum (TT.MM.JJJJ)
24.12.2025

2. Status (aktueller Stand, keine ToDos)
- Notification-Badges laufen weiterhin, auch wenn die Mitteilungssektion nicht aktiv ist; die Snapshot-/Has-New-Pollings feuern nur bei aktiver Sektion (`useNotificationPolling` wurde entsprechend geteilt).
- Die Dokumentation in `docs/code-review-bsky-client.md` wurde aktualisiert, um diese Badge-Entkopplung zu beschreiben.
- Alle Tests (Vitest, gesamte Repo) sowie die Pre-Commit-Lint/Build-Kette verliefen erfolgreich; bekannte Warnungen (AppProvider Dispatch, `@atproto/lex-data` Ponyfills, Backend-Logging `EACCES`, Chunk-Size-Warnung) bleiben bestehen.

3. Startpunkt (kurze Einleitung für die nächste Session)
Badge-Polling ist sauber entkoppelt, der Orchestrator ruft die Hook-Flags korrekt auf; beim nächsten Mal schauen wir, ob neue Section-Konsumenten oder Provider-Splits weitere Anpassungen erfordern.

4. Nächste Schritte (konkrete, umsetzbare ToDos)
1) Beobachte die Badge-Aktualisierung über längere Sitzungen und dokumentiere Auffälligkeiten (z. B. im Issue-Log oder TODO-Board).
2) Prüfe, ob zusätzliche Sections (Profil/Settings/Saved) neue Polling-Anforderungen verursachen, und gleiche sie ggf. mit `ClientServiceOrchestrator` ab.

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) Provider-Split weiter vorbereiten: kleineres `AppContext`-Refactoring, damit Dispatches nur betroffene Reducer treffen.
2) UI-Service-Logik weiter auslagern: z. B. `SectionRenderer` oder neue Section-Komponenten, damit sie selbst keine Hooks aktivieren, sondern gezielt Services triggern.

6. Abschluss-Check (prüfbare Kriterien, optional)
- `useNotificationPolling` nutzt weiterhin `fetchUnreadNotificationsCount` für Badges und `fetchNotificationPollingSnapshot` nur bei `active === true`.
- `ClientServiceOrchestrator` gibt `keepBadgeFresh: true` weiter, und `SectionRenderer` bleibt erneute Polling-Firewalls fern.
- Tests & Lint/Build wurden zuletzt vollständig durchlaufen.

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Brauchen neue Feeds/Listen irgendwann doch neben UI-Tab-Polling auch Hintergrund-Logik, oder bleibt die Badge-Only-Strategie ausreichend?
