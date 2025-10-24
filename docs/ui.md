# UI‑Richtlinien (Frontend)

Kurzer Leitfaden für konsistente Komponenten und Styles im Dashboard.

## Bausteine

- `Card` (`dashboard/src/components/ui/Card.jsx`)
  - Standardkarte mit Border, Shadow, optionalem Hover (`hover`-Prop)
  - Padding via Tailwind-Klasse (`padding`-Prop) steuerbar

- `Button` (`dashboard/src/components/ui/Button.jsx`)
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

- `ToastProvider` & `useToast` (`dashboard/src/components/ui/ToastProvider.jsx`, `hooks/useToast.js`)
  - Einheitliche Toasts (`success`, `error`, `info`). Bitte keine ad-hoc `alert()` verwenden.

## Patterns

- Primäre Aktion der Formulare: `Button primary` rechts unten; sekundäre Aktionen links davon (`secondary`).
- Karten: `Card` als Wrapper, konsistente Abstände via `padding` steuern.
- Listen: Karten‑Hover nur, wenn die Karte interaktiv wirkt.
- Badges: Status‐Farben konsistent (Grün=success, Amber=warning, Rot=destructive).
- SSE-Hooks: `useSse` vor `useSkeets`/`useThreads` initialisieren, damit `sseConnected` korrekt übergeben wird und Polling sich selbst deaktiviert.
- Floating Toolbar erst einblenden, wenn Aktionen verfügbar sind (z. B. sichtbare IDs vorhanden); ansonsten versteckt lassen.

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
