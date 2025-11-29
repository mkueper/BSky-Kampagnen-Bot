# BSky-Kampagnen-Bot – UI-Konventionen (Dashboard & BSky-Client)

Diese Datei definiert die verbindlichen Richtlinien für das Erstellen und Pflegen von UI-Komponenten in Dashboard und BSky-Client.

---

## 1. Geltungsbereich

* React-Komponenten in `dashboard/src/**`
* React-Komponenten in `bsky-client/src/**`
* Layout-Strukturen, Hooks und UI-Helper
* Komponenten für Modals, Buttons, Lists, Cards

---

## 2. Allgemeine Prinzipien

1. **Einheitliches Erscheinungsbild** gemäß bestehendem Styleguide.
2. **Keine Logik in der UI**, außer klar lokaler UI-Logik.
3. **Klare Trennung von Präsentation und Zustand** (Hooks vs. reine UI-Komponenten).
4. **Keine Seiteneffekte in Renderfunktionen**.
5. **UI-Komponenten sind möglichst zustandslos**, Logik wandert in Hooks.

---

## 3. Komponentenstruktur

### 3.1 Ordnung

* Jede Komponente bekommt ihren eigenen Ordner bei komplexen Strukturen:

  * `<ComponentName>/index.jsx`
  * `<ComponentName>/styles.css` oder equivalent
  * `<ComponentName>/hooks.js` (optional)

### 3.2 Dateinamen

* Komponenten im PascalCase: `NotificationCard.jsx`
* Hooks im camelCase: `useNotifications.js`

---

## 4. Styling

### 4.1 Dashboard

* Tailwind-Klassen bevorzugen
* Inline-Styles vermeiden
* Keine !important-Regeln

### 4.2 Bsky-Client

* Tailwind + lokale CSS-Dateien
* Wiederverwendbare Utility-Klassen nutzen

### 4.3 Einhaltung des Design-Systems

* Farben, Abstände, Fonts gemäß `styles/variables.css`
* Keine willkürlichen Farbcodes

---

## 5. Accessibility (A11y)

* Jede interaktive Komponente benötigt `aria-label` oder verständlichen Text
* Fokus-Zustände müssen sichtbar sein
* Buttons nie als `<div>`
* Bilder immer mit sinnvollen Alt-Texten

---

## 6. UX-Regeln

* Modals schließen sich mit ESC und Klick auf Overlay
* Loading-Indikatoren für jede API-Aktion
* Skeletons nutzen statt "Layout springt"

---

## 7. Komponentenkommunikation

* Props klar typisiert
* Keine impliziten globalen Variablen
* Keine Props über mehrere Ebenen durchschleifen → Hooks oder Context

---

## 8. API-Integration in UI

* API-Aufrufe laufen immer über Hooks oder Services
* Komponenten dürfen nur `useXXX()`-Hooks nutzen
* Fehleranzeigen über zentrale Error-Komponente

---

## 9. Testbarkeit

* Jede UI-Komponente muss testbar sein
* Keine zufälligen IDs; besser `data-component="..."`
* Keine Logik in JSX-Ausdrücken, die Tests brechen

---

## 10. Zusammenspiel mit anderen Konventionen

Diese UI-Konventionen sind ergänzend zu:

* coding-konventionen.md
* api-konventionen.md
* test-konventionen.md
