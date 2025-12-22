1. Datum (TT.MM.JJJJ)
22.12.2025

2. Status (aktueller Stand, keine To-Dos)
Debug-Logging für „dispatch während Render“ ist aktiv: Einträge landen in `localStorage`, Toast-Hinweis erscheint; Download per `bskyDownloadRenderDispatchLog()`. Dokumentation zum Funktionsabgleich mit bsky.app liegt in `docs/bsky-app-gap.md` (Feeds/Listen ausgenommen). Quote-Karten in der Timeline sind abgedunkelt (opacity), um Antworten hervorzuheben. Tests liefen grün (bekannte Warn-Logs wie zuvor).

3. Startpunkt (kurze Einleitung für die nächste Session)
Als Nächstes werten wir die Render-Dispatch-Logs aus, um die Warnung (und evtl. den ungewollten Refresh) zu lokalisieren.

4. Nächste Schritte (konkrete, umsetzbare To-Dos)
- Render-Dispatch-Logs herunterladen und die auslösende Stelle bestimmen.
- Beobachten: bsky.app Verhalten bei deaktivierter Video-Allowlist prüfen und dokumentieren.
- Beobachten: Modal-Höhe im Client-Settings-Dialog (aktuell 65vh) visuell im Auge behalten.
- Beobachten: nur offizielle Bluesky-Labels in Content-Warnblöcken anzeigen (Fremdlabels dürfen nicht auftauchen).
- Beobachten: Inline-Videos stoppen zuverlässig, wenn sie aus dem Viewport verschwinden oder verdeckt werden.

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) Render-Dispatch-Logs prüfen und die Quelle fixieren.
2) Beobachten: Video-Allowlist-Verhalten mit bsky.app abgleichen und ggf. anpassen.
3) Beobachten: Modal-Höhe im Client-Settings-Dialog visuell prüfen.
4) Beobachten: Content-Warnblöcke bleiben auf offizielle Bluesky-Labels beschränkt.
5) Beobachten: Inline-Videos stoppen beim Wegscrollen bzw. Verlassen des Viewports.

6. Abschluss-Check (prüfbare Kriterien, optional)
- Debug-Log lässt sich per `bskyDownloadRenderDispatchLog()` herunterladen.
- Content-Warnblöcke erscheinen nur für offizielle Bluesky-Labels.
- Mitteilungen zeigen Interaktoren wie im Vorbild (Avatar-Stack, Toggle, Liste) ohne Layout-Sprünge.
- Video-Hosts-Verhalten entspricht bsky.app, wenn Allowlist deaktiviert ist.

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Sollen Client-Einstellungen später serverseitig persistiert werden (Preferences), oder bleibt alles lokal?
