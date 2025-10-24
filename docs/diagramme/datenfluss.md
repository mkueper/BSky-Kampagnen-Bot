# Datenfluss – Post erstellen

Das folgende Sequence-Diagramm beschreibt den regulären Ablauf vom Planen eines Skeets bis zur Veröffentlichung über den Scheduler. Fehler- und Retry-Pfade sind eingezeichnet, um das Verhalten bei API-Problemen zu verdeutlichen.

```mermaid
sequenceDiagram
  participant User as Redaktion
  participant FE as Dashboard
  participant BE as Backend-API
  participant DB as SQLite
  participant SCH as Scheduler
  participant BSKY as Bluesky API

  User->>FE: Skeet/Thread erfassen
  FE->>BE: POST /api/skeets (oder /api/threads)
  BE->>DB: Datensatz anlegen (inkl. Medien, Plattformen)
  BE-->>FE: 201 Created + SSE: skeet:updated

  loop Cron-Zyklus
    SCH->>DB: Fällige Jobs suchen
    SCH->>BE: dispatchSkeet()
    BE->>BSKY: Post senden (inkl. Medien Upload)
    alt Erfolg
      BSKY-->>BE: URI + Metadata
      BE->>DB: platformResults aktualisieren, Repeat vorbereiten
      BE-->>SCH: Erfolg zurückmelden
      BE-->>FE: SSE: skeet:updated (Status published)
    else Fehler
      BSKY-->>BE: Fehlermeldung / Rate Limit
      BE->>DB: platformResults.status=failed + Retry-Zähler
      SCH->>SCH: Retry mit Backoff planen
      BE-->>FE: SSE: skeet:updated (Status failed)
    end
  end

  opt Engagement
    FE->>BE: POST /api/threads/:id/engagement/refresh (oder Auto-Collector)
    BE->>BSKY: Likes/Reposts/Replies abrufen
    BE->>DB: SkeetReactions/Replies aktualisieren
    BE-->>FE: SSE: skeet:engagement / thread:engagement
  end
```
