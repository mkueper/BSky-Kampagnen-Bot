# UI‑Richtlinien (Frontend)

Kurzer Leitfaden für konsistente Komponenten und Styles im Dashboard.

## Bausteine

- `Card` (`@bsky-kampagnen-bot/shared-ui`)
  - Standardkarte mit Border, Shadow, optionalem Hover (`hover`-Prop)
  - Padding via Tailwind-Klasse (`padding`-Prop) steuerbar

- `Button` (`@bsky-kampagnen-bot/shared-ui`)
  - Varianten: `primary`, `secondary`, `neutral`, `warning`, `destructive`, `ghost`
  - Größen: `md`, `icon`; disabled-Zustand und Fokus sind vordefiniert

- `Badge` (`dashboard/src/components/ui/Badge.jsx`)
  - Varianten: `neutral`, `outline`, `success`, `warning`, `destructive`
  - Größen: `sm`, `md`; optionales `icon` für Plattform-Symbole

- `SummaryCard` (`dashboard/src/components/ui/SummaryCard.jsx`)
  - Zahlenkacheln für Kennzahlen (Übersicht). Akzeptiert `label`, `value`, optionale Trend-Indikatoren.

- `ActivityPanel` (`dashboard/src/components/ui/ActivityPanel.jsx`)
  - Umschlag für Listenbereiche mit Tabs/Filter, z. B. Skeet-Aktivität.

- `FloatingToolbar` (`dashboard/src/components/ui/FloatingToolbar.jsx`)
  - Kontextbezogene Toolbar, die beim Scrollen eingeblendet wird. Nutzt Portals; Buttons bitte über die vorhandenen Varianten anlegen.

- `ToastProvider` & `useToast` (`@bsky-kampagnen-bot/shared-ui`)
  - Einheitliche Toasts (`success`, `error`, `info`). Bitte keine ad-hoc `alert()` verwenden.

## Terminologie

- Im UI sprechen wir durchgängig von **Beiträgen** (statt „Skeets“), um plattformneutral zu bleiben:
  - Beispiele: „Geplante Beiträge“, „Veröffentlichte Beiträge“, „Wartende Beiträge“, „Nächster Beitrag“.
  - Technische Begriffe wie `Skeet`, `SkeetModel` etc. bleiben im Backend und in der internen Doku bestehen.
- Für den Status „pending_manual“ verwenden wir im UI die Bezeichnung **„wartend“**:
  - Tab-Label: z. B. `Wartend` (statt „Freigabe“/„Pending“).
  - Hinweistexte: Formulierungen wie „Auf Freigabe wartende Beiträge“ bzw. „Beiträge, die auf Freigabe warten“.

### Benennung: Beiträge-Navigation

- Navigation (Sidebar):
  - Hauptpunkt: **„Beiträge“** (vorher „Skeets“).
  - Unterpunkte:
    - **„Aktivität“** (Beitragsaktivität/Übersicht der Zustände).
    - **„Planen“** (vorher „Skeet planen“).
- Seitentitel / Header:
  - Beiträge-Übersicht: großer Header **„Beiträge – Übersicht“**.
  - Planer-Ansicht: großer Header **„Beitrag planen“**.
  - Panels innerhalb der Übersicht:
    - z. B. **„Beitragsaktivität“** als Panel-Titel für den Bereich mit Tabs „Geplant“, „Veröffentlicht“, „Wartend“, „Papierkorb“.

### Plattformbegriffe vs. Navigationsbegriffe

Wir unterscheiden klar zwischen:

- **Plattform-/Protokollbegriffen** (Actions, Labels direkt aus Bluesky/Mastodon),
- und **Navigations-/Bereichsnamen** im Kampagnen-Bot.

**Plattformnahe Begriffe (Actions, Buttons, Menüs)**

Diese folgen der Bluesky-UI (deutsch) möglichst exakt:

- `Post` → **„Post“** (als technische Einheit; im Fließtext kann „Beitrag“ verwendet werden)
- `Thread` → **„Thread“**
- `Reply` → **„Antworten“**
  - Wichtig: nicht „Antwort“, nicht „Beantworten“, sondern exakt „Antworten“.
- `Repost` → **„Reposten“**
  - Bluesky nutzt hier eine progressive Form; keine Umschreibung wie „Weiterverbreiten“.
- `Quote Post` → **„Post zitieren“**
  - Keine eigenen Begriffe wie „Zitatpost“ oder „Zitat erstellen“ verwenden.

Diese Begriffe werden insbesondere für:

- Kontextmenüs (z. B. in der Beitrags-/Thread-UI),
- Buttons und Aktionen,
- Tooltips/`aria-label`s

verwendet, damit die Terminologie mit der Original-Bluesky-Oberfläche kompatibel bleibt.

**Navigations- und Bereichsnamen im Kampagnen-Bot**

- Hier verwenden wir bewusst **„Beiträge“** als Oberbegriff (siehe oben), um eine verständliche, deutschsprachige Navigation zu haben:
  - NAV: „Beiträge“ → Unterpunkte „Aktivität“, „Planen“.
  - Header: „Beiträge – Übersicht“, „Beitrag planen“.
  - Panels: „Beitragsaktivität“, „Geplante Beiträge“, „Veröffentlichte Beiträge“, „Wartende Beiträge“ usw.
- Thread-spezifische Bereiche dürfen `Thread` im Namen behalten:
  - z. B. „Threads – Übersicht“, „Thread planen“, mit erläuternden Unterzeilen wie „mehrteilige Beiträge (Threads)“.

## Patterns

- Primäre Aktion der Formulare: `Button primary` rechts unten; sekundäre Aktionen links davon (`secondary`).
- Karten: `Card` als Wrapper, konsistente Abstände via `padding` steuern.
- Listen: Karten‑Hover nur, wenn die Karte interaktiv wirkt.
- Badges: Status‐Farben konsistent (Grün=success, Amber=warning, Rot=destructive).
- SSE-Hooks: `useSse` vor `useSkeets`/`useThreads` initialisieren, damit `sseConnected` korrekt übergeben wird und Polling sich selbst deaktiviert.
- Floating Toolbar erst einblenden, wenn Aktionen verfügbar sind (z. B. sichtbare IDs vorhanden); ansonsten versteckt lassen.

### Tabs und Zähler (Beispiele Skeet-/Beitragsaktivität)

- Tabs innerhalb eines ActivityPanels verwenden eine einheitliche Struktur:
  - Linksbündiges Label (z. B. „Geplant“, „Veröffentlicht“, „Wartend“, „Papierkorb“).
  - Optional ein **Badge rechts im Tab**, wenn eine Anzahl dargestellt werden soll (z. B. Anzahl wartender Beiträge).
- Wenn ein Tab einen Zähler anzeigt, sollten **alle Tabs desselben Blocks** grundsätzlich die Möglichkeit für einen Badge haben, auch wenn der Wert häufig `0` ist.
- Umgang mit leeren Zuständen:
  - Entweder: Tab bei `0` deaktivieren und klar visuell abgeschwächt darstellen.
  - Oder: Tab bleibt aktiv, Badge ist leer/0, und der **Empty State wird im Inhalt** kommuniziert (z. B. Karte mit „Derzeit keine wartenden Beiträge“).
  - Entscheidung pro View, aber innerhalb eines Panels konsistent halten.

### Hinweistexte

- Buttons, Tabs und kritische Aktionen sollten sprechende Titel/Tooltips erhalten:
  - Beispiel Tab „Wartend“: Tooltip/Hinweistext „Auf Freigabe wartende Beiträge“.
  - Beispiel Buttons in Toolbars: `aria-label` + `title` setzen, damit die Bedeutung auch ohne sichtbaren Text klar ist.
- Leere Listen/States immer mit einem kurzen erklärenden Hinweistext versehen (nicht einfach „leer“ lassen).

## Beispiele

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

## Hinweise

- Farben/Typografie folgen dem globalen Theme (Light/Dark/Midnight).
- Für themenabhängige Styles bevorzugt CSS-Variablen (`bg-background`, `text-foreground`, …) statt fixer Hex-Werte verwenden.
- Bitte neue Oberflächen bevorzugt auf diesen Bausteinen aufbauen.

## Pane-Zuordnung

### NAV-Pane (linke Sidebar)
- Permanente Navigation und Schnellaktionen (Compose, Theme, Feeds). Wird nicht pro View getauscht.

### Content-Pane (Hauptbereich)
- `timeline`: Home-Feed/Tabs (TimelineHeader)
- `search`: Globale Suche (SearchView)
- `notifications`: Mitteilungen inkl. Tabs
- `settings`, `blocks`, `saved`, etc. – sämtliche Hauptsektionen laufen hier
- Der Inhalt bleibt im DOM und wird nur bei aktivem Detail-Pane via CSS ausgeblendet.

### Detail-Pane (rechter/unterer Bereich)
- `thread`: Thread-Lesefenster (zeigt aktuell den kompletten Baum; Unroll-Button steuert den Autoren-View)
- `profileViewer`: Modalersatz für Profilansichten
- `hashtagSearch`: Hashtag-Suche inkl. Tabs
- Weitere darstellungsbezogene Views (z. B. künftige Modals) können hier integriert werden, solange sie dem Pane-Layout folgen.

### Modals (klassisch)
- Composer, Medien-Dialoge, Bestätigungen – reine Dialoge, keine Pane-Inhalte.
