Du bist Codex im BSky-Kampagnen-Bot. Bitte beachte dauerhaft:

## Changelog & Review
1. Pro Tag nur ein Abschnitt „## yyyy-mm-dd“.
2. Unterabschnitte nach Bereichen („### Client“, „### Backend“, …).
3. Einträge beginnen mit Labels wie **Refactor UI:**, **Bugfix Backend:**, **Improvement:** usw.
4. Keine Commits oder Changelog-Einträge ohne Rücksprache; Änderungen zuerst zeigen.
5. Abgeschlossene Aufgaben im Backlog erst in „Review“ verschieben.

## Zusammenarbeit & Kommunikation
1. Zeige Änderungen zuerst, commite nur auf ausdrückliche Freigabe.
2. Beschreibe Refactorings/Tests, damit ich daraus lernen kann.
3. Wenn ich Fragen stelle oder nach deiner Meinung frage, keine Code-Aktionen sondern nur Antworten.
4. Immer erst nachfragen, bevor die angegebene Aufgabe aus dem Backlog ausgeführt wird.
5. Aufgabenpflege: Sobald wir mit einer Aufgabe beginnen, wandert sie nach „In Progress“. Erst nach visueller Prüfung und `npm run test` (bzw. passenden Checks) verschieben wir sie nach „Review“; aus „Review“ geht es nach „Done“ oder zurück in die vorherigen Phasen.
6. Backlog-Pflege: Punkte konsequent zwischen Backlog/In Progress/Review/Done verschieben.
7. Backlog-Einträge in der Phase „Backlog“ immer nummerieren, damit wir einfacher auf „Aufgabe 2“ usw. verweisen können.
8. Vor jedem Commit sicherstellen, dass `changelog-unreleased.md` aktualisiert ist.

## UI & Konsistenz
1. Neue Menüs über Radix-Popover (`InlineMenu`), damit Timeline/Dashboard identisch funktionieren.
2. Beim Erstellen neuer UI-Komponenten oder Ansichten darauf achten, dass Darstellung und Bedienung konsistent bleiben (z. B. „Mehr laden“-Buttons statt Scroll-Ende).
3. Detail-Paneels (Thread/Profil/Hashtag) nutzen den gleichen rechten Bereich; Composer & Medien bleiben klassische Modals.

## Begrifflichkeiten
1. **Thread:** vollständiger Post-Baum aus `app.bsky.feed.getPostThread`.
2. **Autor-Thread:** Thread, bei dem `record.reply.root.author.did === record.author.did`; Unroll-Button/Zusatzelemente beziehen sich ausschließlich auf diesen Fall.
3. **Thread-Lesefenster:** rechter Pane im Layout, der Threads darstellt (Standard: voller Thread, optional Autor-Thread).
4. **Detailpane:** Gemeinsame Bezeichnung für alle Paneels rechts (Thread, Profilviewer, Hashtag-Suche).
