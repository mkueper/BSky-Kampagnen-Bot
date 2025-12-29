1. Datum (TT.MM.JJJJ)
29.12.2025

2. Status (aktueller Stand, keine To-Dos)
- Discover-Feeds laden jetzt nur noch beim Öffnen des Feeds-Menüs; beim App-Start werden nur Pins/Saved geladen.
- Home wartet initial auf geladene Pins, bevor die Timeline gerendert wird.
- Start-Refresh ist auf genau einen initialen Timeline-Refresh begrenzt (keine Mehrfach-Neuaufladungen/Top-Post-Sprünge).
- Infinite Scroll für Discover-Vorschläge ist aktiv; Button „Feed anheften“ ist breiter und zeigt ein Pin-Icon.

3. Startpunkt (kurze Einleitung für die nächste Session)
Prüfen, ob die Home-Timeline beim Start nur einmal lädt und ob Pins korrekt erscheinen, ohne Platzhalter-Flackern.

4. Nächste Schritte (konkrete, umsetzbare ToDos)
1) Verhalten beim ersten Start im UI testen (Pins laden, keine Mehrfach-Refreshes).
2) Prüfen, ob Discover-Vorschläge erst beim Öffnen des Feeds-Menüs geladen werden.

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) Startverhalten im Client verifizieren und Feedback notieren.
2) Falls noch Flackern vorhanden: Refresh-Guards weiter schärfen.

6. Abschluss-Check (prüfbare Kriterien, optional)
- Home lädt genau einmal und zeigt danach stabil die Timeline.
- Pins erscheinen zuverlässig ohne mehrfaches Neuzeichnen.
- Discover lädt erst beim Öffnen des Feeds-Menüs.

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Gibt es zusätzliche Bedingungen, wann Discover vorab geladen werden darf?
- Soll der initiale Ladehinweis für Pins angepasst werden?
