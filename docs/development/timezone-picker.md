# TimeZonePicker – gemeinsamer Zeitzonen-Selector in `shared-ui`

**Ziel:** Wiederverwendbare Komponente zur Auswahl einer IANA-Zeitzone (`Europe/Berlin`, `UTC`, …), einsetzbar im Dashboard, im bsky-client und in zukünftigen Oberflächen.

---

## Grundprinzip

- Extern wird ausschließlich mit **IANA-Zeitzonen-IDs** gearbeitet (z. B. `Europe/Berlin`, `UTC`), keine festen Offsets wie `UTC+2`.
- Die Komponente ist **kontrolliert**: `value` kommt von außen, Änderungen laufen über `onChange`.
- i18n (Label, Placeholder, Fehlermeldungen) wird nicht im Picker selbst gepflegt, sondern über Props aus der jeweiligen App eingebunden.

---

## API-Skizze

```ts
type TimeZoneId = string; // IANA-ID, z. B. "Europe/Berlin"

interface TimeZonePickerProps {
  value: TimeZoneId | null;
  onChange: (nextTimeZone: TimeZoneId | null) => void;

  label?: React.ReactNode;
  placeholder?: string;
  helperText?: string;
  error?: string;

  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;

  /** Vorrangig anzuzeigende Zeitzonen (z. B. ["Europe/Berlin", "UTC"]). */
  favoriteTimeZones?: TimeZoneId[];

  /** Optional kuratierte Gesamtmenge erlaubter Zeitzonen. */
  timeZones?: TimeZoneId[];
}
```

---

## Verhalten (UX)

- Darstellung als **ComboBox/Select mit Suchfeld**:
  - Filterung nach IANA-ID und einem menschenlesbaren Label (z. B. „Europa / Berlin“).
  - Favoriten erscheinen oben, danach alphabetische Liste der restlichen Einträge.
- Einträge werden typischerweise im Format angezeigt:
  - `Europe/Berlin — UTC+01:00`
  - `America/New_York — UTC-05:00`
- Standardwert:
  - Wird von der aufrufenden App gesetzt (z. B. `TIME_ZONE` aus `/api/settings/general` oder die Browser-Zeitzone).

---

## Verwendung im Dashboard (Beispiel)

```jsx
import { TimeZonePicker } from '@bsky-kampagnen-bot/shared-ui'

function GeneralSettingsTimeZone({ values, defaults, onChange, t }) {
  return (
    <TimeZonePicker
      id="general-timeZone"
      value={values.timeZone || null}
      onChange={(tz) =>
        onChange({ timeZone: tz || '' })
      }
      label={t('config.general.labels.timeZone', 'Standard-Zeitzone')}
      placeholder={defaults.timeZone || 'Europe/Berlin'}
      helperText={t(
        'config.general.timeZoneHint',
        'Beispiel: Europe/Berlin oder UTC (IANA-Zeitzone).'
      )}
      favoriteTimeZones={['Europe/Berlin', 'UTC']}
    />
  )
}
```

---

## Zeitzonen-Datenbasis

- Technische Basis sind IANA-Zonen aus der Runtime (`Intl.DateTimeFormat`) oder einer kuratierten Liste.
- Für eine erste Version kann eine **interne Auswahl gängiger Zeitzonen** gepflegt werden (Europa, Nordamerika, UTC), später optional ersetzbar durch eine Library wie `@vvo/tzdb` (Abstimmung im Team erforderlich, bevor eine neue Dependency ergänzt wird).

