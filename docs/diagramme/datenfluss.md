# Datenfluss – Post erstellen

Das folgende Sequence-Diagramm beschreibt den regulären Ablauf vom Planen eines Skeets bis zur Veröffentlichung über den Scheduler. Fehler- und Retry-Pfade sind eingezeichnet, um das Verhalten bei API-Problemen zu verdeutlichen.

```mermaid
sequenceDiagram
  participant U as Nutzer:in (Browser)
  participant FE as Web-Frontend
  participant BE as Backend-API
  participant DB as Datenbank
  participant SCH as Scheduler
  participant BSKY as Bluesky API

  U->>FE: Skeet oder Thread planen
  FE->>BE: POST /campaigns/{id}/skeets
  BE->>DB: Speichern mit tenant_id und Status
  BE-->>FE: 201 Created

  SCH->>DB: Fällige Jobs abrufen
  SCH->>BE: Job ausführen
  BE->>DB: Credentials entschlüsseln
  BE->>BSKY: Post erstellen
  alt Erfolg
    BSKY-->>BE: URI zurückgeben
  else Fehler
    BSKY-->>BE: 4xx/5xx-Fehler
    BE->>BE: Retry mit Backoff planen
  end
  BE->>DB: Status "sent" und post_uri speichern
  BE-->>SCH: Job abgeschlossen
  FE->>BE: GET Status
  BE-->>FE: Aktuellen Status (sent/failed) liefern
```
