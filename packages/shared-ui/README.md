# @bsky-kampagnen-bot/shared-ui

Shared-UI-Library für alle Frontends des Kampagnen-Bots (`dashboard`, Bluesky-Client, Mastodon-Client, zukünftige UIs).

## Scope

- Enthält ausschließlich **präsentationsorientierte** Bausteine:
  - visuelle Komponenten (z.B. `Button`, `Card`, `Modal`, `MediaDialog`, `ThemeToggle`, `NewPostsBanner`),
  - UI-nahe Hooks (`useToast`, `useThemeMode`),
  - Theme-Konfiguration und Provider (`ThemeProvider`, `THEMES`, `THEME_CONFIG`, `DEFAULT_THEME`).
- Enthält **keine** fachliche Geschäftslogik:
  - keine API-Calls,
  - keinen Zugriff auf App-spezifische Hooks (`useSkeets`, `useThreads`, `useSession` etc.),
  - keine Entscheidungen wie “planen vs. sofort senden” oder Statuswechsel.

- Shared-UI ist **plattformagnostisch** und wird so gestaltet, dass die Komponenten sich an das umgebende Designsystem anpassen können (z.B. über Klassen, Variants, Theme-Tokens).

Container-Komponenten in `dashboard`, Bluesky-Client oder Mastodon-Client verbinden diese UI-Bausteine mit der jeweiligen Fachlogik.

## Nutzung

Alle externen Konsumenten importieren Komponenten und Hooks über den Haupteinstieg:

```js
import {
  Button,
  Card,
  Modal,
  MediaDialog,
  ThemeToggle,
  ToastProvider,
  useToast,
  useThemeMode,
  ThemeProvider
} from '@bsky-kampagnen-bot/shared-ui'
```

Subpath-Exports (z.B. `@bsky-kampagnen-bot/shared-ui/MediaDialog`) sind nur für spezielle Fälle vorgesehen und werden in `package.json` explizit aufgeführt.
