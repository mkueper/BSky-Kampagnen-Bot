# UI-Konventionen

**BSky-Kampagnen-Tool – UI-Leitfaden für Dashboard & BSky-Client**

Dies ist der zentrale, menschlich lesbare Styleguide für alle UI-Entwicklungen im Dashboard und im BSky-Client.
Er vereint die allgemeinen Prinzipien konsistenter UI-Entwicklung mit den projektspezifischen Komponenten, Patterns und Layout-Regeln.

---

## 1. Grundprinzipien

1. **Konsistenz vor Kreativität** – Die UI soll vertraut, vorhersehbar und vereinheitlicht sein.
2. **Klare Rollenverteilung** – Komponenten präsentieren, Hooks steuern, APIs liefern Daten.
3. **Keine Seiteneffekte in Renderfunktionen** – Logik gehört in Hooks.
4. **A11y als Standard** – Jede interaktive Komponente muss zugänglich sein.
5. **Einheitliche Bausteine** nutzen – Card, Button, Badge usw. aus shared-ui.
6. **Stabilität des Layouts** – Skeletons statt Layout-Sprünge.

---

## 2. Komponentenarchitektur

### 2.1 Typen

* **UI-Komponenten (Präsentation)**: rein aus Props, kein Zustand.
* **Container-Komponenten**: bündeln UI + Logik.
* **Hooks**: API-Calls, Ableitungen, SSO/SSE-Handling.
* **Context**: global für Theme, Session, Notifications.

### 2.2 Ordnerstruktur

```
<ComponentName>/
  index.jsx
  hooks.js (optional)
  styles.css (optional)
```

Nicht erlaubt: große Single-Files mit UI + API + State ineinander.

---

## 3. Styling-Regeln

### 3.1 Tailwind

* Primärsystem für Styling.
* Keine Inline-Styles, außer absolut notwendig.
* Nur erlaubte Variablen benutzen (`bg-background`, `text-foreground`).

### 3.2 Lokale CSS-Dateien

Erlaubt für:

* komplexe Layouts,
* mehrstufige Animationen,
* globale Variablen.

### 3.3 Theming (Light/Dark/Midnight)

* Farbwerte niemals hartcodieren.
* CSS-Variablen nutzen.

---

## 4. Bausteine (shared-ui & Dashboard)

### 4.1 Card

* Standardkarte mit Shadow, Border.
* Hover optional steuerbar (`hover`-Prop).
* Padding über `padding`-Prop.

### 4.2 Button

Varianten:

* `primary` – Hauptaktionen
* `secondary` – alternative Navigation
* `neutral` – unkritisch
* `warning` – Achtung
* `destructive` – irreversible Aktionen
* `ghost` – unauffällig

Größen: `md`, `icon`.
Alle Zustände (disabled, focus) vorgegeben.

### 4.3 Badge

* Varianten: `neutral`, `outline`, `success`, `warning`, `destructive`
* Größen: `sm`, `md`
* Optional: `icon` für Plattform-Symbole

### 4.4 SummaryCard

* Zahlenkacheln für Kennzahlen
* Akzeptiert `label`, `value`, optionale Trend-Indikatoren

### 4.5 ActivityPanel

* Container für Listenbereiche mit Tabs/Filter
* z. B. Skeet-Aktivität

### 4.6 FloatingToolbar

* Kontexttoolbar
* Wird beim Scrollen eingeblendet
* Buttons über Standardvarianten
* Nur einblenden, wenn Aktionen verfügbar sind

### 4.7 ToastProvider & useToast

* Einheitliche Toasts (`success`, `error`, `info`)
* **Keine** ad-hoc `alert()`-Calls

---

## 5. UI-Patterns

### 5.1 Formulare

* Primäre Aktion unten rechts (Button `primary`)
* Sekundäre Aktion links daneben (`secondary`)

### 5.2 Karten

* `Card` als Wrapper für Listen und Sektionen
* Hover **nur**, wenn interaktiv

### 5.3 Listen

* Skeletons beim Laden
* Karten-Hover konsistent
* Virtualisierung ab 100+ Einträgen

### 5.4 Badges

* Erfolgsstatus: Grün
* Warnungen: Amber
* Fehler: Rot

### 5.5 Floating Toolbar

* Nur anzeigen, wenn Aktion verfügbar
* Versteckt, wenn leer oder keine IDs geladen

### 5.6 SSE / Live-Daten

* `useSse` **immer vor** `useSkeets` / `useThreads` initialisieren
* Dadurch deaktiviert sich Polling automatisch

---

## 6. UX-Richtlinien

### Navigation

* NAV-Pane (links): persistent, nicht view-abhängig
* Content-Pane: Hauptbereich aller Views
* Detail-Pane: Threads, ProfileViewer, Hashtag-Search

### Laden & Fehler

* Nie leere Layouts
* Immer Skeletons oder Spinner
* Klare Fehlertexte
* Wiederholen-Button bei API-Fehlern

### Interaktion

* Hover-Stati sichtbar
* Click-Targets ≥ 40px

---

## 7. Pane-Zuordnung

### 7.1 NAV-Pane (linke Sidebar)

* Dauerhafte Navigation
* Schnellaktionen: Compose, Theme, Feeds

### 7.2 Content-Pane (Hauptbereich)

* Home-Timeline / Tabs
* Globale Suche
* Notifications
* Settings, Blocks, Saved
* Inhalt bleibt im DOM; Blendung via CSS

### 7.3 Detail-Pane

* Thread-Lesefenster (kompletter Baum)
* ProfileViewer (Modal-Ersatz)
* HashtagSearch

### 7.4 Modals

* Composer
* Medien-Dialoge
* Bestätigungsdialoge

---

## 8. Accessibility (A11y)

### Grundregeln

* Fokus sichtbar
* aria-label für jede interaktive Komponente
* Tastaturbedienung vollständig

### Bilder

* Sinnvolle Alternativtexte
* Dekorative Bilder → `alt=""`

### Modals

* Fokus muss im Modal bleiben
* ESC und Overlay schließen Dialog

---

## 9. API-Integration

* API-Aufrufe ausschließlich in Hooks
* Komponenten nutzen nur Rückgabe des Hooks
* Optimistic Updates nur, wenn reversibel
* Fehler zentral über `useToast` oder Error-Komponente

---

## 10. Beispiele

### Komponentennutzung

```
    import Button from "../components/ui/Button";
    import Card from "../components/ui/Card";
    import Badge from "../components/ui/Badge";

    function Example() {
      return (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Titel</h3>
            <Badge size="sm" variant="success" icon="✓">OK</Badge>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary">Speichern</Button>
            <Button variant="secondary">Abbrechen</Button>
          </div>
        </Card>
      );
    }
```

---

## 11. Testing der UI

* Verhalten testen, nicht Layout
* Selektoren: `data-component="..."`
* Kein Snapshot-Testing für Layout

---

## 12. Zusammenspiel mit anderen Konventionen

* coding-konventionen.md
* api-konventionen.md
* db-konventionen.md
* test-konventionen.md
