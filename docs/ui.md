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
- `InfoDialog` (`@bsky-kampagnen-bot/shared-ui`)
  - Generischer Info-Dialog auf Basis von `Modal` mit einheitlichem Layout:
    - schmaler Haupttextblock (`max-w-[52ch]`, `bg-background-subtle`, `rounded-2xl`, `px-4`, `py-3`)
    - optionaler Introtext oberhalb und optionaler Monospace-/Beispielblock darunter
  - Props:
    - `title`: Dialogtitel (string oder React-Node)
    - `introText?`: optionaler Einleitungstext (ReactNode)
    - `content`: Hauptinhalt (ReactNode, Pflicht)
    - `examples?`: optionaler Monospace-/Beispielblock (`<pre>`, z. B. Cron-Beispiele)
    - `closeLabel?`: Label des Schließen-Buttons (i18n, z. B. `t('common.actions.close', 'Schließen')`)
    - `onClose`: Callback beim Schließen
    - `panelClassName?`: optionale zusätzliche Klassen für die Panel-Breite

**Beispiel: InfoDialog im Dashboard**

```jsx
import { InfoDialog } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../i18n/I18nProvider.jsx'

function CronInfo({ open, onClose }) {
  const { t } = useTranslation()

  return (
    <InfoDialog
      open={open}
      title={t('config.scheduler.cronInfoTitle', 'Cron-Ausdruck')}
      onClose={onClose}
      closeLabel={t('common.actions.close', 'Schließen')}
      panelClassName="max-w-[80vw] md:max-w-[900px]"
      content={(
        <>
          <p>
            {t(
              'config.scheduler.tips.serverTime',
              'Cron-Ausdrücke beziehen sich auf die Serverzeit – beim Deployment sollte auf die korrekte Zeitzone geachtet werden.'
            )}
          </p>
          <p>
            {t(
              'config.scheduler.cronInfoSummary',
              'Cron-Ausdrücke steuern, wann das Kampagnen‑Tool geplante Posts verarbeitet.'
            )}
          </p>
        </>
      )}
      examples={t(
        'config.scheduler.cronInfoBody',
        'Beispiele:\n0 * * * * – jede volle Stunde\n…'
      )}
    />
  )
}
```

## Terminologie

- Im UI sprechen wir durchgängig von **Posts** (statt „Skeets“), um plattformneutral zu bleiben:
  - Beispiele: „Geplante Posts“, „Veröffentlichte Posts“, „Wartende Posts“, „Nächster Post“.
  - Technische Begriffe wie `Skeet`, `SkeetModel` etc. bleiben im Backend und in der internen Doku bestehen.
- Für den Status „pending_manual“ verwenden wir im UI die Bezeichnung **„wartend“**:
  - Tab-Label: z. B. `Wartend` (statt „Freigabe“/„Pending“).
  - Hinweistexte: Formulierungen wie „Auf Freigabe wartende Posts“ bzw. „Posts, die auf Freigabe warten“.

### Produktname

- Produktname des Tools im UI: **„Kampagnen‑Tool“** (mit Bindestrich).
  - Verwendet in prominenten Stellen: App-Header, About-Überschrift, ggf. Window-/Titelzeile.
- Im Fließtext sprechen wir von **„dem Kampagnen‑Tool“**, z. B.:
  - „Dieses Kampagnen‑Tool unterstützt das Planen …“
- Plattform-spezifische Bereiche behalten ihren Zusatz:
  - z. B. NAV-Eintrag **„Bluesky Client“** bleibt bestehen und verweist explizit auf den eingebetteten Bluesky-Client.

### Benennung: Posts-Navigation

- Navigation (Sidebar):
  - Hauptpunkt: **„Posts“** (vorher „Skeets“).
  - Unterpunkte:
    - **„Aktivität“** (Post-Aktivität/Übersicht der Zustände).
    - **„Planen“** (vorher „Skeet planen“).
- Seitentitel / Header:
  - Posts - Übersicht: großer Header **„Posts – Übersicht“**.
  - Planer: großer Header **„Post planen“**.
  - Panels innerhalb der Übersicht:
    - z. B. **„Post-Aktivität“** als Panel-Titel für den Bereich mit Tabs „Geplant“, „Veröffentlicht“, „Wartend“, „Papierkorb“.

### Datenhaltung: veröffentlichte Posts

- Die Ansicht „Veröffentlichte Posts“ dient der **Auswertung und Nachverfolgung** (Reaktionen aktualisieren, ggf. zurückziehen), nicht der Bereinigung.
- Im Dashboard gibt es daher **keine UI-Aktion**, um veröffentlichte Posts vollständig aus der Datenbank zu löschen.
- Aufräum- oder Löschvorgänge (z. B. Entfernen alter Testdaten, DSGVO-Löschungen) gehören später in einen separaten **Admin-/Datenverwaltungsbereich** mit klaren Warnhinweisen und Retention-Regeln und sind aktuell nicht Teil des Dashboards.

### Plattformbegriffe vs. Navigationsbegriffe

Wir unterscheiden klar zwischen:

- **Plattform-/Protokollbegriffen** (Actions, Labels direkt aus Bluesky/Mastodon),
- und **Navigations-/Bereichsnamen** im Kampagnen-Bot.

**Plattformnahe Begriffe (Actions, Buttons, Menüs)**

Diese folgen der Bluesky-UI möglichst exakt:

- `Post` → **„Post“** (als technische Einheit; im Fließtext kann „Post“ verwendet werden)
- `Thread` → **„Thread“**
- `Reply` → **„Antworten“**
  - Wichtig: nicht „Antwort“, nicht „Beantworten“, sondern exakt „Antworten“.
- `Repost` → **„Reposten“**
  - Bluesky nutzt hier eine progressive Form; keine Umschreibung wie „Weiterverbreiten“.
- `Quote Post` → **„Post zitieren“**
  - Keine eigenen Begriffe wie „Zitatpost“ oder „Zitat erstellen“ verwenden.

Diese Begriffe werden insbesondere für:

- Kontextmenüs (z. B. in der Posts-/Thread-UI),
- Buttons und Aktionen,
- Tooltips/`aria-label`s

verwendet, damit die Terminologie mit der Original-Bluesky-Oberfläche kompatibel bleibt.

**Navigations- und Bereichsnamen im Kampagnen-Bot**
**Navigations- und Bereichsnamen im Kampagnen‑Tool**

- Hier verwenden wir bewusst **„Posts“** als Oberbegriff (siehe oben), um eine verständliche, deutschsprachige Navigation zu haben:
  - NAV: „Posts“ → Unterpunkte „Aktivität“, „Planen“.
  - Header: „Posts – Übersicht“, „Post planen“.
  - Panels: „Post-Aktivität“, „Geplant“, „Veröffentlicht“, „Wartend“ usw.
- Thread-spezifische Bereiche dürfen `Thread` im Namen behalten:
  - z. B. „Threads – Übersicht“, „Thread planen“, mit erläuternden Unterzeilen wie „mehrteilige Posts (Threads)“.

## Patterns

- Primäre Aktion der Formulare: `Button primary` rechts unten; sekundäre Aktionen links davon (`secondary`).
- Karten: `Card` als Wrapper, konsistente Abstände via `padding` steuern.
- Listen: Karten‑Hover nur, wenn die Karte interaktiv wirkt.
- Badges: Status‐Farben konsistent (Grün=success, Amber=warning, Rot=destructive).
- SSE-Hooks: `useSse` vor `useSkeets`/`useThreads` initialisieren, damit `sseConnected` korrekt übergeben wird und Polling sich selbst deaktiviert.
- Floating Toolbar erst einblenden, wenn Aktionen verfügbar sind (z. B. sichtbare IDs vorhanden); ansonsten versteckt lassen.

### Tabs und Zähler (Beispiele Post-Aktivität)

- Tabs innerhalb eines ActivityPanels verwenden eine einheitliche Struktur:
  - Linksbündiges Label (z. B. „Geplant“, „Veröffentlicht“, „Wartend“, „Papierkorb“).
  - Optional ein **Badge rechts im Tab**, wenn eine Anzahl dargestellt werden soll (z. B. Anzahl wartender Posts).
- Wenn ein Tab einen Zähler anzeigt, sollten **alle Tabs desselben Blocks** grundsätzlich die Möglichkeit für einen Badge haben, auch wenn der Wert häufig `0` ist.
- Umgang mit leeren Zuständen:
  - Entweder: Tab bei `0` deaktivieren und klar visuell abgeschwächt darstellen.
  - Oder: Tab bleibt aktiv, Badge ist leer/0, und der **Empty State wird im Inhalt** kommuniziert (z. B. Karte mit „Derzeit keine wartenden Posts“).
  - Entscheidung pro View, aber innerhalb eines Panels konsistent halten.

### Hinweistexte

- Buttons, Tabs und kritische Aktionen sollten sprechende Titel/Tooltips erhalten:
  - Beispiel Tab „Wartend“: Tooltip/Hinweistext „Auf Freigabe wartende Posts“.
  - Beispiel Buttons in Toolbars: `aria-label` + `title` setzen, damit die Bedeutung auch ohne sichtbaren Text klar ist.
- Leere Listen/States immer mit einem kurzen erklärenden Hinweistext versehen (nicht einfach „leer“ lassen).
- Persönliche Anredeformen wie „du“ oder „Sie“ vermeiden; Texte neutral formulieren:
  - Statt „Backoff und Grace‑Zeit legst du fest, wie lange das Nachholen erlaubt ist“
  - lieber „Über Backoff und Grace‑Zeit wird festgelegt, wie lange das Nachholen erlaubt ist“.

### Zeitzonen (UI & Scheduler)

- Die **Standard-Zeitzone** wird in den allgemeinen Einstellungen gepflegt und als `TIME_ZONE` im Backend gespeichert.
- Der Scheduler verwendet diese Zeitzone, um Cron-Ausdrücke auszuwerten (Zeitpunkt der Verarbeitung geplanter Posts/Threads).
- Das Dashboard holt die aktuelle Zeitzone über `/api/client-config` und nutzt sie für Datums-/Zeitfelder in `SkeetForm` und `ThreadForm` (z. B. Standardvorschlag für „nächster Tag 09:00 Uhr“).
- Hinweise und InfoDialog-Texte sollten klarstellen, dass:
  - sich Cron-Ausdrücke auf die **Serverzeitzone** beziehen,
  - die im Dashboard angezeigten Uhrzeiten auf der konfigurierten **Standard-Zeitzone** basieren (nicht zwingend der lokalen Browser-Zeitzone).

#### Info-Buttons & Detail-Hinweise

- Für längere Erklärtexte verwenden wir ein einheitliches **Info-Muster**, analog zu `SkeetForm` / `ThreadForm`:
  - Direkt in der Oberfläche stehen nur kurze, kontextnahe Hinweise (z. B. Beispiele im Cron-Bereich).
  - Ein `Info`-Button (kleine, pillenförmige Schaltfläche mit `i`‑Icon) öffnet bei Klick ein Modal/Sheet mit der ausführlichen Erklärung.
- Technische Umsetzung:
  - Pro Bereich ein lokaler `useState`‑Flag (z. B. `cronInfoOpen`), der den Info-Dialog steuert.
  - Der Button erhält immer `aria-label` und `title`, z. B.:
    - `aria-label="Hinweis zu Cron-Ausdruck anzeigen"`
    - `title="Hinweis anzeigen"`.
  - Icon und Button-Stil orientieren sich an den bestehenden Info-Buttons in `SkeetForm.jsx` / `ThreadForm.jsx` (gleiche SVG, gleiche Tailwind-Klassen).
- Anwendungsfälle:
  - Komplexe Konfigurationen (Cron-Ausdruck, Retry/Backoff, Polling-Strategie),
  - Zugangsdaten für externe Dienste (Bluesky, Mastodon, Tenor),
  - längere fachliche Erläuterungen, die das Layout nicht „sprengen“ sollen.
- Inhaltliche Faustregeln für InfoDialog-Texte:
  - Möglichst kompakt in 3–5 Absätzen bleiben.
  - Wenn mehr Text nötig ist, den `content`-Block mit `max-h-[60vh] overflow-y-auto` versehen, damit der Dialog nicht überläuft.

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

- Farben/Typografie folgen dem globalen Theme (Light/Dark/Midnight/Dimmed).
- Für themenabhängige Styles bevorzugt CSS-Variablen (`bg-background`, `text-foreground`, …) statt fixer Hex-Werte verwenden.
- Bitte neue Oberflächen bevorzugt auf diesen Bausteinen aufbauen.

### Abstände in Einstellungs-Karten

- Gestapelte Einstellungsblöcke innerhalb einer Karte (z. B. in `ConfigPanel` für „Scheduler & Retry“ oder „Zugangsdaten“) verwenden einheitliche vertikale Abstände:
  - Zwischen den Blöcken: Container mit `className="space-y-6"` (oder äquivalent), sodass die optischen Bereichsboxen gleich weit auseinanderliegen.
  - Innerhalb eines Blocks: `className="space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4"` für Überschrift und Felder.
- Bereits bestehende Einstellungsbereiche (ConfigPanel-Tabs, About-Ansicht „Über Kampagnen‑Tool“) folgen diesem Muster. Neue Einstellungsbereiche sollten es ebenfalls übernehmen, damit Zeilenabstände und Blockabstände im gesamten Dashboard konsistent bleiben.

### Aktionsgruppen mit Info-Button

- Gruppen aus zusammengehörigen Aktionen (z. B. Export/Import plus Info-Button im Header der Posts-/Threads-Übersicht) werden optisch als Einheit dargestellt:
  - Container: `inline-flex rounded-2xl border border-border-muted bg-background-elevated p-1 shadow-soft`.
  - Innenliegende Buttons nutzen die bestehenden Button-Varianten (`primary`, `secondary`) und der Info-Button folgt dem Info-Pattern (kleine Pille mit `i`‑Icon, Border).
- Neue Aktionsgruppen sollten dieses Muster übernehmen, damit Header-Aktionen im Dashboard einheitlich wirken und Info-Buttons klar einer Gruppe zugeordnet sind.

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
