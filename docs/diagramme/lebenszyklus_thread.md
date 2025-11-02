# Lebenszyklus – Thread

Das Diagramm zeigt, wie sich der Status eines mehrteiligen Threads verändert. Übergänge berücksichtigen sowohl erfolgreiche Komplettveröffentlichungen als auch Fehler bei einzelnen Posts.

```mermaid
stateDiagram-v2
  state "Entwurf" as draft_state
  state "Geplant" as scheduled_state
  state "Im Versand" as publishing_state
  state "Veröffentlicht" as published_state
  state "Fehlgeschlagen" as failed_state
  state "Papierkorb" as deleted_state

  style draft_state fill:#9e9e9e,color:#fff
  style scheduled_state fill:#1976d2,color:#fff
  style publishing_state fill:#ff9800,color:#000
  style published_state fill:#4caf50,color:#fff
  style failed_state fill:#f44336,color:#fff
  style deleted_state fill:#000000,color:#fff

  [*] --> draft_state

  draft_state --> scheduled_state: Termin setzen
  draft_state --> publishing_state: Publish-now
  draft_state --> deleted_state: Löschen

  scheduled_state --> draft_state: Termin entfernen
  scheduled_state --> publishing_state: Scheduler startet
  scheduled_state --> deleted_state: Löschen

  publishing_state --> published_state: Alle Segmente gesendet
  publishing_state --> failed_state: Segment-Fehler/Rate Limit

  failed_state --> publishing_state: Retry
  failed_state --> draft_state: Neuplanen
  failed_state --> deleted_state: Papierkorb

  published_state --> deleted_state: Retract / Entfernen

  deleted_state --> scheduled_state: Wiederherstellen
  deleted_state --> [*]: Permanent löschen
```

> *Teilweise gesendet*: Wenn nur einzelne Plattformen/Segmente fehlschlagen, bleibt der Thread in `publishing` bis der Scheduler alle Segmente verarbeitet hat. Betroffene Plattformen werden in `platformResults` mit Status `partial` markiert.
