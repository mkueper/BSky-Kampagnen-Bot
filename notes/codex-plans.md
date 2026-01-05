1. Datum (TT.MM.JJJJ)
04.01.2026

2. Status (aktueller Stand, keine ToDos)
- Client-URLs werden jetzt in der Settings-Tabelle persistiert; keine .env-Fallbacks fuer diese Werte.
- Session-Dauer ist im Dashboard unter Allgemein konfigurierbar.
- Wiederholungswert "0" wird konsistent als "keine Wiederholung" normalisiert (API + Import + Editor-Laden).
- changelog-unreleased wurde aktualisiert und codex-remember um die Changelog-Regel ergaenzt.

3. Startpunkt (kurze Einleitung fuer die naechste Session)
Der Backend/Dashboard-Stand ist committed; als naechstes kann der Fokus auf die offenen Client-UX-Themen bzw. Feed-/Timeline-Menues gelegt werden.

4. Naechste Schritte (konkrete, umsetzbare ToDos)
1) Client-UX/Listen-Themen aus den offenen Fragen oder den remind-me-Listen priorisieren.
2) Falls noetig, Client-Menu-Angleichung zur bsky.app (Timeline/Erwaehnungen) pruefen.

5. ToDos nach Prioritaet, sofern bekannt durchnummerieren, sonst anhaengen
1) Priorisierung der offenen Client-Themen (Listen-Refresh/Positionsspruenge, pinned Feeds).

6. Abschluss-Check (pruefbare Kriterien, optional)
- Settings-URLs werden persistiert und beim Abrufen korrekt geladen.
- Session-Dauer ist in Allgemein sichtbar und speicherbar.
- Repeat-Wert "0" erzeugt keinen fehlenden Datums-Picker bei "keine Wiederholung".

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Welche Client-Themen haben als naechstes Prioritaet?
