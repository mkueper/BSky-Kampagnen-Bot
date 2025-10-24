# Statusfarben-Legende

Die Tabelle definiert die Farbzuordnung für Status in UI-Komponenten und Diagrammen. Änderungen sollten synchron im Frontend, in den CSS-Variablen und in den Mermaid-Diagrammen übernommen werden.

| Status / Badge | Farbe (Hex) / Variant | Verwendung |
|----------------|-----------------------|------------|
| `draft`        | `#9e9e9e`             | Entwürfe ohne Termin/Veröffentlichung |
| `scheduled`    | `#1976d2`             | Geplante Skeets/Threads |
| `publishing`   | `#ff9800`             | Thread wird gerade versendet |
| `published`    | `#4caf50`             | Erfolgreich veröffentlichte Inhalte |
| `failed`       | `#f44336`             | Fehler beim Versand oder Engagement-Retrieval |
| `deleted`      | `#000000`             | Papierkorb / permanent gelöscht |
| `pending`      | Badge-Variant `outline` | Plattform noch ausstehend (siehe `PlatformBadges`) |
| `sent`         | Badge-Variant `success` | Plattform erfolgreich veröffentlicht |
| `partial`      | Badge-Variant `warning` | Teilweise gelöscht oder nur teilweise gesendet |
| Start/End      | `#ffffff`             | Start- bzw. Endknoten in Diagrammen |

> Tipp: In Komponenten bevorzugt Tailwind-Variablen (`bg-primary`, `text-foreground` etc.) verwenden und nur bei Diagrammen/Legenden Hex-Werte hinterlegen. Für Dark-Mode-Anpassungen den Kontrast mit Tools wie WebAIM prüfen.
