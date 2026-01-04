# Import-Format: Threads

Diese Vorlage beschreibt das JSON-Format für den Import geplanter Threads. Der Import akzeptiert entweder ein Array oder ein Objekt mit dem Feld `threads`.

## Struktur

```json
{
  "exportedAt": "2026-01-05T12:00:00.000Z",
  "count": 1,
  "threads": [
    {
      "title": "Kampagnen-Thread",
      "scheduledAt": "2026-01-06T09:00:00.000Z",
      "scheduledPlannedAt": "2026-01-06T09:00:00.000Z",
      "status": "scheduled",
      "targetPlatforms": ["bluesky"],
      "appendNumbering": true,
      "metadata": {},
      "segments": [
        {
          "sequence": 0,
          "content": "Teil 1",
          "appendNumbering": true,
          "characterCount": 120,
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
  ]
}
```

Minimaler Import (Array ist ebenfalls erlaubt):

```json
[
  {
    "title": "Thread ohne Termin",
    "targetPlatforms": ["bluesky"],
    "segments": [
      { "content": "Erstes Segment" }
    ]
  }
]
```

## Felder (Thread)

- `title` (string | null): optionaler Titel.
- `scheduledAt` (string | null): ISO-Zeitpunkt für den Versand.
- `scheduledPlannedAt` (string | null): Geplante Zeit ohne Jitter (optional).
- `status` (string): z. B. `draft|scheduled|published` (optional, Default `draft`).
- `targetPlatforms` (string[]): z. B. `["bluesky","mastodon"]`.
- `appendNumbering` (boolean): Nummerierung für Segmente (Default `true`).
- `metadata` (object): optionale Metadaten (bestimmte Felder werden beim Import bereinigt).
- `segments` (array, erforderlich): Liste der Thread-Segmente.

## Felder (Segment)

- `content` (string, erforderlich): Segmenttext.
- `sequence` (number): Reihenfolge (0-basiert, optional).
- `appendNumbering` (boolean): Segment-spezifisches Override (optional).
- `characterCount` (number): optionaler Zähler (wird sonst berechnet).
- `media` (array | undefined): bis zu 4 Medienobjekte (siehe Skeets).

## Hinweise

- Mindestens ein Segment ist erforderlich; leere Segmente sind nicht erlaubt.
- Duplikate (Titel + Termin + identische Segmenttexte) werden beim Import übersprungen.
- Wenn `scheduledAt` fehlt und `scheduledPlannedAt` gesetzt ist, wird `scheduledPlannedAt` genutzt.
