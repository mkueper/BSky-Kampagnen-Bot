1. Datum (TT.MM.JJJJ)
06.01.2026

2. Status (aktueller Stand, keine ToDos)
- Preview-Proxy ist in Client und Dashboard konfigurierbar; Backend liefert die URL, Client speichert lokal.
- Dashboard-Config zeigt Preview-Proxy als separates Feld; Client nutzt /preview-Fallback per Settings.
- Client-Settings UI fuer Externe Dienste wurde mehrfach geschliffen (Texte/Hint-Logik/Layout).
- Bsky-Client Container-Build nutzt Nginx-Setup; Preview-Proxy laeuft als eigener Container im Compose.

3. Startpunkt (kurze Einleitung fuer die naechste Session)
Der aktuelle Fokus liegt auf Feinschliff der Client-Einstellungen (Texte, Layout/Scroll) und dem finalen Preview-Proxy-Wording; Feed-/Timeline-Themen bleiben offen.

4. Naechste Schritte (konkrete, umsetzbare ToDos)
1) Client-Einstellungen final abstimmen (Texte, Platzierung, Scroll-Vermeidung).
2) Offene Client-UX/Listen-Themen aus den offenen Fragen priorisieren.

5. ToDos nach Prioritaet, sofern bekannt durchnummerieren, sonst anhaengen
1) Entscheidung zur Layout-/Spacing-Reduktion in den Client-Einstellungen.
2) Priorisierung der offenen Client-Themen (Listen-Refresh/Positionsspruenge, pinned Feeds).

6. Abschluss-Check (pruefbare Kriterien, optional)
- Preview-Proxy ist in Client/Dashboard speicherbar und wird korrekt verwendet.
- Client-Einstellungen benoetigen kein Scrollen fuer Externe Dienste (optional).

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Soll die Client-Einstellungen-UI kompakter werden, um Scrollen zu vermeiden?
- Welche Client-Themen haben als naechstes Prioritaet?
