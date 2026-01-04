# Import-Format: Skeets (Einzelposts)

Diese Vorlage beschreibt das JSON-Format für den Import geplanter Skeets. Der Import akzeptiert entweder ein Array oder ein Objekt mit dem Feld `skeets`.

## Struktur

```json
{
  "exportedAt": "2026-01-05T12:00:00.000Z",
  "count": 1,
  "skeets": [
    {
      "content": "Beispieltext",
      "scheduledAt": "2026-01-06T09:00:00.000Z",
      "scheduledPlannedAt": "2026-01-06T09:00:00.000Z",
      "repeat": "none",
      "repeatDayOfWeek": null,
      "repeatDayOfMonth": null,
      "targetPlatforms": ["bluesky"],
      "media": [
        {
          "data": "data:image/png;base64,...",
          "mime": "image/png",
          "altText": "Kurzbeschreibung",
          "filename": "bild.png"
        }
      ]
    }
  ]
}
```

Minimaler Import (Array ist ebenfalls erlaubt):

```json
[
  {
    "content": "Geplanter Post",
    "scheduledAt": "2026-01-06T09:00:00.000Z",
    "targetPlatforms": ["bluesky"]
  }
]
```

## Felder (Skeet)

- `content` (string, erforderlich): Text des Posts.
- `scheduledAt` (string | null): ISO-Zeitpunkt für den Versand.
- `scheduledPlannedAt` (string | null): Geplante Zeit ohne Jitter (optional).
- `repeat` (string): `none|daily|weekly|monthly`.
- `repeatDayOfWeek` (number | null): Wochentag (z. B. 0–6).
- `repeatDayOfMonth` (number | null): Tag im Monat (1–31).
- `targetPlatforms` (string[]): z. B. `["bluesky","mastodon"]`.
- `threadId` (number | null): optionaler Verweis auf Thread (selten nötig).
- `isThreadPost` (boolean | null): optional, wenn Skeet Teil eines Threads ist.
- `media` (array | undefined): bis zu 4 Medienobjekte.

## Medienobjekt

- `data` (string): Data-URL (`data:<mime>;base64,...`), erforderlich.
- `mime` (string): MIME-Typ (z. B. `image/png`).
- `altText` (string | null): optionaler ALT-Text.
- `filename` (string | null): optionaler Dateiname.

## Hinweise

- Duplikate (Inhalt + Termin/Repeat-Felder) werden beim Import übersprungen.
- Wenn `scheduledAt` fehlt und `scheduledPlannedAt` gesetzt ist, wird `scheduledPlannedAt` genutzt.
