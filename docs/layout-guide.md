# Layout & UI Guide (Frontend)

Ein konsolidierter Leitfaden für konsistente Komponenten, Layout-Struktur und Styling im Bluesky-Client.
Er definiert, wie Oberflächen aufgebaut werden und welche UI-Bausteine zur Verfügung stehen.

## 1. Grundprinzipien des Layouts

### 1.1 Ein einziger scrollbarer Container

Im gesamten Client existiert genau ein scrollbarer Container pro Pane.
Keine mehrfach verschachtelten `overflow-auto/overflow-scroll`.

#### Warum:

- Vorhersehbares Scrollverhalten
- Keine unsichtbaren Scrollpfeile
- Keine Layout-Konflikte zwischen Komponenten

### 1.2 Feste Rollen der Panes

Jede Oberfläche gehört strikt in **NAV**, **Content** oder **Detail**.  
Keine Vermischung der Layout-Verantwortlichkeiten.

### 1.3 Konsistente Abstände

Statt Layout-Hacks (`mb-3`, `pb-3`, etc.) werden definierte Container genutzt:

- Header → klarer Abschluss
- Content → konsistente Padding-Zonen
- Footer/Toolbars → definiert und nicht ad hoc eingefügt

### 1.4 Responsive Regeln

- Keine horizontalen Scrollbars
- Layout funktioniert auf Desktop, Tablet, Mobile
- Minimalbreite definiert (z. B. 340–380px)
- NAV-Pane bleibt konstant; Content passt sich flexibel an

### 1.5 Trennung von Struktur vs. Logik

Layout-Komponenten enthalten keine inhaltliche Logik.
Beispiel: Kein „wenn Timeline X, dann Padding Y“ in Layout-Containern.

---

## 2. UI-Bausteine

### 2.1 Card (`@bsky-kampagnen-bot/shared-ui`)

- Standardkarte mit Border, Shadow
- Optionales Hover (hover-Prop)
- Padding via Tailwind-Klasse (padding)
 
### 2.2 Button

Varianten:
- `primary`
- `secondary`
- `neutral`
- `warning`
- `destructive`
- `ghost`

Größen: `md`, `icon`  
Vordefinierter Fokus & Disabled-State.

### 2.3 Badge

Varianten:
- `neutral`
- `outline`
- `success`
- `warning`
- `destructive`

Größen: `sm`, `md`  
Optionales `icon` für Plattform-Symbole.

### 2.4 SummaryCard

- Kennzahlen-Kachel
- Props: `label`, `value`, optionale Trendanzeigen

### 2.5 ActivityPanel

Wrapper für listenbasierte Bereiche mit Tabs/Filtern
(z. B. Skeet-Aktivität).

### 2.6 FloatingToolbar

- Kontextbezogene Toolbar über Portals
- Wird erst eingeblendet, wenn Aktionen verfügbar sind
- Kein permanentes Platzreservieren im Layout

### 2.7 ToastProvider & useToast

- Zentrale Toast-Mechanik
- Varianten: success, error, info
- Keine alert()-Aufrufe im Code

---

## 3. Interaktions-Patterns

### 3.1 Primäre Aktionen

- Der primäre Button eines Formulars befindet sich `rechts unten`.
- Sekundäre Aktionen stehen links daneben.

### 3.2 Listen & Karten

- Hover-Effekt nur bei interaktiven Karten
- Keine unnötigen Shadow-Varianten
- Gleichmäßige Abstände innerhalb von Listen

### 3.3 Farbsystem

- Grün = success
- Amber = warning
- Rot = destructive
- Typografie und Farben folgen den globalen Themes

### 3.4 Icons

Icons und deren Stil im gesamten Projekt konsistent halten.

- Beipsiele (Medien einfügen)
  - Icon GIF (einfügen)
  - Icon Medien (einfügen)
  - Icon Emoji (einfügen)

### 3.5 CSS-Variablen bevorzugen

Statt fixer Farben:  
`bg-background`, `text-foreground`, `border-color`, etc.

### 3.5 SSE-Hooks

- Reihenfolge: `useSse` vor `useSkeets`/`useThreads` aufrufen
- Damit Polling korrekt deaktiviert wird, wenn SSE verfügbar ist

---

## 4. Pane-Struktur

### 4.1 NAV-Pane (linke Sidebar)

- Permanente Navigation
- Schnellaktionen: Compose, Feed-Auswahl, Theme
- Bleibt immer sichtbar
- Wird nicht pro View ausgetauscht

### 4.2 Content-Pane (Hauptbereich)

Zeigt die aktuelle Hauptansicht, z. B.:

- timeline (Home-Feed)
- search
- notifications
- settings
- blocks
- saved
- weitere Hauptmodule

#### Wichtig:
Der Inhalt bleibt im DOM – Umschalten erfolgt über Zustand & CSS.

### 4.3 Detail-Pane

Dient als Seiten-/Unteransicht:

- thread (kompletter Threadbaum)
- profileViewer
- hashtagSearch
- spätere Detailansichten

#### Regel:
Detail-Panes überdecken den Content-Pane, ersetzen ihn aber nicht vollständig.

### 4.4 Modals

Klassische Dialoge:

- Composer
- Medienauswahl
- Bestätigungsdialoge

Keine Pane-Inhalte; temporäre Überlagerung.

Sonstige Modale Dialoge:

- Unroll eines zusammenhängenden Thread eines Autors.
- GIF einfügen (packages/media-pickers)
- Emoji einfügen (packages/media-pickers)
- Bild einfügen sollte auch in das packages media-pickers verschoben werden.
- Video einfügen (neue Funktion)

---

## 5. Do’s & Don’ts

### Do

- Konsistente Pane-Aufteilung
- Komponenten ausschließlich aus dem Shared-UI-Paket verwenden bzw. neu erstellen oder dorthin verschieben.
- CSS-Variablen statt Hexfarben
- Nur einen scrollbaren Container pro Pane
- Layout klar dokumentieren

### Don’t

- Keine Inline-Styles
- Keine Layout-Sonderfälle pro Komponente
- Keine Scroll-Hacks (`pb-3`, `mb-2` zur Reparatur von Overflow)
- Keine doppelten oder konkurrierenden Wrappers
- Keine selbstgebastelten Farben oder Shadow-Varianten

## 6. Beispiel (aus ui.md übernommen) 

```jsx
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
