1. Datum (TT.MM.JJJJ)
06.01.2026

2. Status (aktueller Stand, keine ToDos)
- Keine neuen Aenderungen seit dem letzten Stand; Feed-Aufgaben bleiben offen.
- Feeds-Seite zeigt nur echte gespeicherte/angepinnte Feeds; Fehler-Feeds werden herausgefiltert.
- Feed-Metadaten für Feeds/Listen werden geladen (inkl. Listentypen via `app.bsky.graph.getList`); Error-Objekte werden nicht mehr in die UI gepusht.
- Vereinbart: Home-Tabs sollen ausschließlich aus den tatsächlich gepinnten Feeds/Listen (inkl. Standardlisten) abgeleitet werden, um Duplikate zu vermeiden und bsky.app zu matchen.
- Notiert: Tabs/Scroller im Home dürfen sich nicht überlagern; bei Feed-Auswahl über „Feeds“ soll der entsprechende Tab markiert und in den sichtbaren Bereich gescrollt werden.

3. Startpunkt (kurze Einleitung für die nächste Session)
Als nächstes stellen wir die Home-Tabs auf gepinnte Feeds/Listen um und sorgen dafür, dass Tab-Scroll/Markierung korrekt auf Feed-Auswahl reagiert, ohne UI-Überlagerungen.

4. Nächste Schritte (konkrete, umsetzbare ToDos)
1) Home-Tabs-Quelle auf gepinnte Feeds/Listen (inkl. Standardlisten) umstellen und Duplikate eliminieren.
2) Tab-Leiste: Scroll-Buttons/Scroll-Container so anpassen, dass keine Überlagerung entsteht.
3) Bei Feed-Auswahl aus dem Menü den passenden Tab markieren und in den sichtbaren Bereich scrollen.

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) Tabs auf Home nur aus gepinnten Feeds/Listen ableiten; Standardlisten berücksichtigen und Dedupe sicherstellen.
2) Tab-Leiste: Überlagerungen vermeiden und aktiven Feed-Tab nach Auswahl aus dem Menü sichtbar machen (Scroll-Into-View + Markierung).

6. Abschluss-Check (prüfbare Kriterien, optional)
- Home-Tabs basieren ausschließlich auf gepinnten Feeds/Listen und zeigen keine Duplikate.
- Tab-Leiste überlagert keine Scroll-Buttons/Scroll-Flächen.
- Feed-Auswahl im Menü markiert den passenden Tab und scrollt ihn in den sichtbaren Bereich.

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Welche Full-Parity-Features folgen nach dem MVP (z. B. Feed-Search, Create/Subscribe, Feedeinstellungen)?
- Gibt es Einschränkungen bei bsky.app Features, die wir bewusst nicht übernehmen wollen?
