# Style-Guide für das Dashboard

Dieser Ordner bündelt alle Styles des Dashboards. Die Dateien sind nach Verantwortlichkeiten getrennt und nutzen gemeinsame Design-Tokens.

---

## Design-Tokens (`variables.css`)

- Enthält globale Farben, Abstände, Radien, Typografie- und Transition-Werte.
- Dark-Mode-Varianten werden über `prefers-color-scheme: dark` verwaltet und überschreiben nur die nötigen Variablen.
- Neue Komponenten sollten ausschließlich auf diese Tokens zurückgreifen.

## Basis-Stile (`base.css`)

- Definiert Grundtypografie (`body`, Überschriften) und globale Bedienelemente.
- Button-States (Hover, Active, Focus) inklusive Fokus-Markierungen für Tastatursteuerung.

## Anwendungs-Wrapper (`App.css`)

- Enthält App-weite Layoutregeln (Grid/Flex) und definiert, wie Seitenabstände und Scroll-Verhalten umgesetzt werden.
- Importiert gemeinsame Tokens und sorgt dafür, dass globale Hintergründe/Statusfarben konsistent bleiben.

## Layout & Komponenten

- `layout.css`: Karten- und Listenlayouts, Statusfarben für geplante bzw. veröffentlichte Skeets.
- `menu.css`: Tab-Navigation inklusive Burger-Menü für kleine Screens.
- `skeet-form.css`: Formularlayout, Fokus-Styling sowie Toggles für Zielplattformen.

---

## Arbeitsweise

1. **Tokens prüfen:** Passt ein bestehendes Token? Falls nein, neues Token in `variables.css` ergänzen und dokumentieren.
2. **Verhalten definieren:** Komponenten-spezifische Interaktionen (Hover, Fokus) direkt in der jeweiligen Datei abbilden.
3. **Dokumentation pflegen:** Kurze Kommentarblöcke am Dateianfang beschreiben Zweck und Geltungsbereich.

---

## Qualitätssicherung

- Styles im hellen und dunklen Modus testen (OS-Einstellung oder DevTools).
- Bedienelemente per Tastatur (`Tab`) fokussieren, um den Fokus-Stil zu prüfen.
- Kontrast mit Checkern wie WebAIM gegen WCAG AA verifizieren, wenn Farben geändert werden.
