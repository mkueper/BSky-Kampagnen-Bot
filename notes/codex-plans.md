1. Datum (TT.MM.JJJJ)
03.01.2026

2. Status (aktueller Stand, keine ToDos)
- Share-Menü in Timeline/Mitteilungen nutzt Modals (DM + Embed); DM öffnet Chat mit Prefill und Online-Suche (debounced).
- Feed-Feedback „Mehr/Weniger davon anzeigen“ sendet Interactions; bei fehlender API wird sauberer Hinweis angezeigt.
- Erwähnungen-Menü ist bsky-konform; „Antwort für alle ausblenden“ bleibt sichtbar, ist aber deaktiviert ohne Root-Rechte (Tooltip hinzugefügt).
- Moderationsaktionen verfügbar: Thread stummschalten, Wörter/Tags stummschalten (Prompt), Post für mich ausblenden, Antwort für mich/alle ausblenden (Threadgate), Post melden (Report-Modal).

3. Startpunkt (kurze Einleitung für die nächste Session)
Der Client ist funktional gleichgezogen mit bsky.app in den Menüs für Timeline und Mitteilungen. Als Nächstes können wir UX-Feinschliff (Tooltip/Prompt ersetzen) oder Menü-Angleichung zwischen Timeline und Erwähnungen prüfen.

4. Nächste Schritte (konkrete, umsetzbare ToDos)
1) Prüfen, ob das Timeline-Menü exakt an das bsky.app-Menü angepasst werden soll (Einträge + Reihenfolge).
2) Prompt für „Wörter/Tags stummschalten“ durch ein kleines Modal ersetzen (optional).
3) Echte UI für „Post melden“ weiter verfeinern (z. B. Reason-Descriptions, Erfolgstext, Close-Handling).

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) Menüangleichung Timeline vs. Erwähnungen final entscheiden und umsetzen.
2) Modal für „Wörter/Tags stummschalten“ statt Prompt.
3) Report-Modal weiter an bsky.app anlehnen.

6. Abschluss-Check (prüfbare Kriterien, optional)
- Share/Embed/DM funktionieren in Timeline und Mitteilungen.
- „Mehr/Weniger davon anzeigen“ sendet Feedback oder zeigt sauberen Hinweis bei fehlender API.
- „Antwort für alle ausblenden“ ist nur bei eigenen Threads aktiv (sonst deaktiviert mit Tooltip).

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Soll das „Mehr Optionen“-Menü in der Timeline vollständig an bsky.app angeglichen werden?
- Wollen wir das Prompt für „Wörter/Tags stummschalten“ durch ein eigenes Modal ersetzen?
