# Style-Guide für das Dashboard

Dieser Ordner bündelt alle Styles des Dashboards. Die Dateien sind nach Verantwortlichkeiten getrennt und nutzen gemeinsame Design-Tokens.

---

## Verzeichnisstruktur

- `core/`: Design-Tokens und globale Basiselemente.
- `layout/`: Seitenübergreifende Layout-Rahmen (z. B. Dashboard-Grids, Sticky-Bereiche).
- `components/`: Wiederverwendbare UI-Bausteine wie Karten, Formulare oder Navigation.
- `App.css`: Zentrale Sammelstelle, die alle benötigten Teil-Styles importiert.

---

## Design-Tokens (`core/variables.css`)

- Enthält globale Farben, Abstände, Radien, Typografie- und Transition-Werte.
- Dark-Mode-Varianten werden über `prefers-color-scheme: dark` verwaltet und überschreiben nur die nötigen Variablen.
- Neue Komponenten sollten ausschließlich auf diese Tokens zurückgreifen.

## Basis-Stile (`core/base.css`)

- Definiert Grundtypografie (`body`, Überschriften) und globale Bedienelemente.
- Button-States (Hover, Active, Focus) inklusive Fokus-Markierungen für Tastatursteuerung.

## Layout & Komponenten

- `layout/dashboard-layout.css`: Grid- und Karten-Container, Statusfarben für geplante bzw. veröffentlichte Skeets.
- `components/menu.css`: Tab-Navigation inklusive Burger-Menü für kleine Screens.
- `components/skeet-form.css`: Formularlayout, Fokus-Styling sowie Toggles für Zielplattformen.
- `components/skeet-card.css`: Inhaltliche Darstellung der Skeet-Karten, Reaktionen, Reply-Listen.

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
