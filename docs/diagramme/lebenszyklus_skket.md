
---

### `docs/diagramme/lebenszyklus_skeet.md`
```markdown
# Lebenszyklus – Skeet

Zustände und Übergänge eines Skeets im Kampagnen‑Bot.  
Die Farben entsprechen der [Statusfarben‑Legende](./statusfarben.md).
```

```mermaid
stateDiagram-v2
  state "draft" as draft_state
  state "scheduled" as scheduled_state
  state "sending" as sending_state
  state "sent" as sent_state
  state "failed" as failed_state
  state "cancelled" as cancelled_state
  state "archived" as archived_state
  state "deleted" as deleted_state

  style draft_state fill:#9e9e9e,color:#fff
  style scheduled_state fill:#1976d2,color:#fff
  style sending_state fill:#ff9800,color:#000
  style sent_state fill:#4caf50,color:#fff
  style failed_state fill:#f44336,color:#fff
  style cancelled_state fill:#757575,color:#fff
  style archived_state fill:#607d8b,color:#fff
  style deleted_state fill:#000000,color:#fff

  [*] --> draft_state

  draft_state --> scheduled_state: planen
  draft_state --> deleted_state: löschen

  scheduled_state --> cancelled_state: stornieren
  scheduled_state --> sending_state: job startet

  sending_state --> sent_state: posten erfolgreich
  sending_state --> failed_state: posten fehlgeschlagen

  failed_state --> scheduled_state: retry geplant
  failed_state --> cancelled_state: stornieren
  failed_state --> deleted_state: löschen

  cancelled_state --> scheduled_state: reaktivieren
  cancelled_state --> deleted_state: löschen

  sent_state --> archived_state: archivieren
  sent_state --> deleted_state: löschen

  deleted_state --> [*]
  archived_state --> [*]
```