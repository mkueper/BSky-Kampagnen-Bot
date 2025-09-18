# Style-Guide für das Dashboard

Dieser Ordner bündelt alle Styles des Dashboards. Die Dateien sind nach Verantwortlichkeiten getrennt und bauen auf gemeinsamen Design-Tokens auf.

## Design-Tokens (`variables.css`)
- Enthält alle globalen Farben, Abstände, Radien, Typografie- und Transition-Werte.
- Dark-Mode-Varianten werden über `prefers-color-scheme: dark` verwaltet und überschreiben nur die nötigen Variablen.
- Neue Komponenten sollten ausschließlich auf diese Tokens zurückgreifen, statt eigene Farb- oder Abstandsangaben zu definieren.

## Basis-Stile (`base.css`)
- Legt Grundtypografie (`body`, Überschriften) und Standard-Button-Verhalten fest.
- Buttons erhalten konsistente Hover-, Active- und Focus-States inklusive Fokus-Markierung für Tastatursteuerung.

## Layout & Komponenten
- `layout.css`: Steuert Karten- und Listenlayouts und nutzt semantische Statusfarben für geplante bzw. veröffentlichte Skeets.
- `menu.css`: Beschreibt die Tab-Navigation inklusive Burger-Menü für kleine Screens.
- `skeet-form.css`: Enthält Formularlayout, Fokus-Styling für Eingaben sowie Toggles für Zielplattformen.

## Arbeitsweise
1. Tokens prüfen: Passt ein bestehendes Token? Falls nein, dieses in `variables.css` ergänzen.
2. Verhalten definieren: Komponenten-spezifische Interaktionen (Hover, Fokus) direkt in der jeweiligen Datei abbilden.
3. Dokumentieren: Kurze Kommentarblöcke am Dateianfang beschreiben Zweck und Geltungsbereich.

## Testing & Qualität
- Styles im hellen und dunklen Modus testen (OS-Einstellung oder DevTools).
- Buttons und Eingaben per Tastatur (`Tab`) ansteuern, um den Fokus-Stil zu prüfen.
- Kontrast mit gängigen Checkern (z. B. WebAIM) gegen WCAG AA verifizieren, wenn Farben geändert werden.
