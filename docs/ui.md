# UI‑Richtlinien (Frontend)

Kurzer Leitfaden für konsistente Komponenten und Styles im Dashboard.

## Bausteine

- `Card` (`dashboard/src/components/ui/Card.jsx`)
  - Standardkarte mit Border, Shadow, optionalem Hover (Elevate)
  - Props: `hover` (bool), `padding` (Tailwind‑Klassen)

- `Button` (`dashboard/src/components/ui/Button.jsx`)
  - Varianten: `primary`, `secondary`, `neutral`, `warning`, `destructive`, `ghost`
  - Einheitliche Größen/Abstände; `disabled` korrekt gestylt

- `Badge` (`dashboard/src/components/ui/Badge.jsx`)
  - Varianten: `neutral`, `outline`, `success`, `warning`, `destructive`
  - Größen: `sm`, `md`
  - Optionales `icon`‑Prop für kompakte Chips (z. B. Plattform‑Icons)

## Patterns

- Primäre Aktion der Formulare: `Button primary` rechts unten; sekundäre Aktionen links davon (`secondary`).
- Karten: `Card` als Wrapper, konsistente Abstände via `padding` steuern.
- Listen: Karten‑Hover nur, wenn die Karte interaktiv wirkt.
- Badges: Status‐Farben konsistent (Grün=success, Amber=warning, Rot=destructive).

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
- Bitte neue Oberflächen bevorzugt auf diesen Bausteinen aufbauen.

