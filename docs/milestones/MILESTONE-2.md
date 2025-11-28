# MILESTONE 2 — Navigation & Layout stabilisieren

## Ziel des Milestones

Der Client erhält eine robuste, konsistente Layout-Grundstruktur:

- klare Trennung von NAV-Pane und Content-Pane
- sauberes Verhalten beim Wechsel zwischen Timelines
- Bereinigung der Scroll- & Container-Logik
- Vorbereitung für künftige UI-Erweiterungen

## Issues

### Issue 1 – Content-Pane als alleinigen Haupt-Container definieren

Derzeit wird der Contentbereich von mehreren Komponenten beeinflusst, darunter verschachtelte Container und alte Layoutreste. Ziel ist ein eindeutiger, zentraler Container.

#### Akzeptanzkriterien:

- Ein einzelner, definierter Haupt-Content-Container
- Keine konkurrierenden Wrapper in Unterkomponenten
- Die NAV-Pane beeinflusst das Layout nicht mehr indirekt
- Timeline-, Thread- und Misc-Views rendern immer im gleichen Container

### Issue 2 – NAV-Pane Verhalten vereinheitlichen

Die Navigation ist funktional, aber ihr State und ihre Rendering-Logik sind historisch gewachsen. Das führt zu Unklarheiten beim Wechsel von Home/Discover/Hashtag/Mentions.

#### Akzeptanzkriterien:

- NAV-Pane löst klar definierte Aktionen aus (z. B. `NAV_SWITCH`)
- Keine Seiteneffekte in der NAV-Komponente selbst
- Beim Wechsel wird der Content-Pane korrekt zurückgesetzt
- Hervorhebung des aktiven Menüpunktes konsistent und fehlerfrei

### Issue 3 – State-Reset beim Wechsel der Timelines

Momentan bleiben bestimmte UI-Zustände bestehen (Scrollposition, Marker, Flags).
Diese müssen beim Timeline-Wechsel eindeutig zurückgesetzt werden.

#### Akzeptanzkriterien:

- Scrollposition des Content-Pane wird zuverlässig auf 0 gesetzt
- Marker „Neue Beiträge“ wird zurückgesetzt (wenn Timeline gewechselt wurde)
- Timeline-spezifischer State wird vollständig ersetzt, nicht kumuliert
- Keine Überreste aus der vorherigen Timeline sichtbar

### Issue 4 – Vereinheitlichung der Scroll-Container

Aktuell existieren mehrere scrollbare Container übereinander, was zu falschem Scrollverhalten führt und Pfeile/Indikatoren versteckt.

#### Akzeptanzkriterien:

- Nur ein scrollbarer Container im Content-Pane
- Entfernen unnötiger `overflow-auto` / `overflow-scroll` in Unterkomponenten
- Keine konkurrierenden `pb-xx` oder `mb-xx` Hacks zur Sichtbarkeit der Scrollbar
- Scrollverhalten auf Desktop und Mobile geprüft

### Issue 5 – Problematische Padding-/Margin-Kombinationen entfernen

Layout-„Workarounds“ haben sich über Zeit angesammelt (z. B. `pb-3`, `pt-2`, `sticky + px-4`).  
Diese sollen ersetzt werden durch konsistente Layout-Regeln.

#### Akzeptanzkriterien:

- Entfernen widersprüchlicher Tailwind-Kombinationen
- Klare Definition der vertikalen Struktur (Header → Content → Footer)
- Keine Layout-Sprünge beim Ziehen der Scrollbar
- Keine unterschiedlichen Abstände zwischen den Timelines

### Issue 6 – Responsive-Logik prüfen & fixen

Bei bestimmten Breiten entstehen leicht Layoutsprünge oder ein „einrastender“ Content.

#### Akzeptanzkriterien:

- NAV-Pane, Content-Pane und Header funktionieren auf Desktop, Tablet, Mobile
- Keine horizontalen Scrollbars
- Keine UI-Überlappungen (z. B. Header verschluckt Buttons)
- Minimalbreite des Clients definiert

### Issue 7 – Globale Layoutkomponenten extrahieren

Einige Layoutfragmente liegen verteilt in Komponenten, was Wiederholungen erzeugt (z. B. Header, Inline-Wrapper, Sections).

#### Akzeptanzkriterien:

- Gemeinsame Layout-Bausteine z. B. in `src/layout/`
- Keine doppelten Header/Container-Markups in Timelines
- Stabiler Einstiegspunkt für zukünftige Layout-Refactorings

### Issue 8 – Deaktivieren des „unteren Scrollpfeils“-Fehlverhaltens

Der untere Pfeil der Scrollbar ist manchmal unsichtbar oder nicht erreichbar.

#### Akzeptanzkriterien:

- Scrollbar zeigt zuverlässig beide Pfeile (OS/Browser abhängig)
- Kein Layout-Element überlappt das untere Ende
- Keine unsichtbaren Padding-Elemente erzeugen Fehldarstellung
- Funktion in Chrome, Vivaldi, Firefox geprüft

### Issue 9 – Fokusverhalten definieren (Navigation → Content)

Beim Wechsel über die NAV-Pane bleibt der Fokus manchmal in der Navigation, was zu schlechter Tastaturbedienung führt.

#### Akzeptanzkriterien:

- Fokus springt nach einem Timeline-Wechsel automatisch in den Content-Pane
- Optional: Fokus auf erstes sichtbares Element (oder Top)
- Navigation bleibt keyboard-nutzbar, aber verschwindet aus dem Fokusfluss nach Auswahl

### Issue 10 – Layout-Regeln dokumentieren

Um erneuten Wildwuchs zu verhindern, sollen minimale, klare Layoutregeln dokumentiert werden.

#### Akzeptanzkriterien:

- Kurze Datei `/docs/layout/LAYOUT-GUIDE.md`
- Enthält: Pane-Aufteilung, Scrollverhalten, Responsive-Regeln, Do’s/Don’ts
- Dient als Referenz für M3–M6
- 