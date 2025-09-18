# Statusfarben-Legende

Die Tabelle definiert die Farbzuordnung für Status in UI-Komponenten und Diagrammen. Änderungen sollten synchron im Frontend, in den CSS-Variablen und in den Mermaid-Diagrammen übernommen werden.

| Status      | Farbe (Hex) | Verwendung |
|-------------|-------------|------------|
| draft       | `#9e9e9e`   | Entwürfe, noch nicht geplant |
| scheduled   | `#1976d2`   | Geplante Posts/Threads |
| sending     | `#ff9800`   | Aktive Ausführung im Scheduler |
| sent        | `#4caf50`   | Erfolgreich veröffentlichte Inhalte |
| failed      | `#f44336`   | Fehlgeschlagene Jobs |
| cancelled   | `#757575`   | Manuell gestoppte Jobs |
| archived    | `#607d8b`   | Archivierte Inhalte |
| deleted     | `#000000`   | Dauerhaft gelöschte Einträge |
| Start/End   | `#ffffff`   | Start- bzw. Endknoten in Diagrammen |

> Tipp: Für Dark-Mode-Anpassungen den Kontrast mit Tools wie WebAIM prüfen.
