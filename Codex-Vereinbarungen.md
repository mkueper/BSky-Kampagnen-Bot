Du bist Codex im BSky-Kampagnen-Bot. Bitte beachte dauerhaft:

## Zusammenarbeit & Kommunikation
1. Wir kommunizieren beide auf deutsch.
2. Wenn du Zweifel oder bessere Ideen hast, als das von mir vorgegebene, scheue dich nicht, mir dies zus sagen.
3. Zeige Änderungen zuerst, commite nur auf ausdrückliche Freigabe.
4. Beschreibe Refactorings/Tests, damit ich daraus lernen kann.
5. Wenn ich Fragen stelle oder nach deiner Meinung frage, keine Code-Aktionen sondern nur Antworten.
6. Immer erst nachfragen, bevor die angegebene Aufgabe aus dem Backlog ausgeführt wird.
7. Aufgabenpflege: Sobald wir mit einer Aufgabe beginnen, wandert sie nach „In Progress“. Erst nach visueller Prüfung und `npm run test` (bzw. passenden Checks) verschieben wir sie nach „Review“; aus „Review“ geht es nach „Done“ oder zurück in die vorherigen Phasen.
8. Backlog-Pflege: Punkte konsequent zwischen Backlog/In Progress/Review/Done verschieben.
9. Backlog-Einträge in der Phase „Backlog“ immer nummerieren, damit wir einfacher auf „Aufgabe 2“ usw. verweisen können.
10. Vor jedem Commit sicherstellen, dass `changelog-unreleased.md` aktualisiert ist.
11. Wenn ich „Sichern“ sagen, erstelle bitte standardmäßig einen benannten Snapshot per `git stash create "snapshot …"` (statt Commit-Spam) und nutze diesen zum Zurückrollen.

## Begrifflichkeiten
1. **Thread:** vollständiger Post-Baum aus `app.bsky.feed.getPostThread`.
2. **Autor-Thread:** Thread, bei dem `record.reply.root.author.did === record.author.did`; Unroll-Button/Zusatzelemente beziehen sich ausschließlich auf diesen Fall.
3. **Thread-Lesefenster:** rechter Pane im Layout, der Threads darstellt (Standard: voller Thread, optional Autor-Thread).
4. **Detailpane:** Gemeinsame Bezeichnung für alle Paneels rechts (Thread, Profilviewer, Hashtag-Suche).

## UI & Konsistenz
1. Neue Menüs über Radix-Popover (`InlineMenu`), damit Timeline/Dashboard identisch funktionieren.
2. Beim Erstellen neuer UI-Komponenten oder Ansichten darauf achten, dass Darstellung und Bedienung konsistent bleiben (z. B. „Mehr laden“-Buttons statt Scroll-Ende).
3. Detail-Paneels (Thread/Profil/Hashtag) nutzen den gleichen rechten Bereich; Composer & Medien bleiben klassische Modals.

## Changelog & Review
1. Pro Tag nur ein Abschnitt „## yyyy-mm-dd“.
2. Unterabschnitte nach Bereichen („### Client“, „### Backend“, …).
3. Die Bereich "Backlog", "In Progress" und "Review" nummerieren anstelle von Aufzählungen
4. Abgeschlossene Aufgaben im Backlog erst in „Review“ verschieben.
5. Das Verschieben nach Done erfolgt in einen Abschnitt mit dem aktuellen Datum „### yyyy-mm-dd“
6. Einträge beginnen mit Labels wie **Refactor UI:**, **Bugfix Backend:**, **Improvement:** usw.
7. Keine Commits oder Changelog-Einträge ohne Rücksprache; Änderungen zuerst zeigen.
