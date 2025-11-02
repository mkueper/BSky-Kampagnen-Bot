# Lebenszyklus – Skeet

Das Zustandsdiagramm zeigt alle möglichen Status eines einzelnen Skeets und die wichtigsten Übergänge. Die Farben orientieren sich an der [Statusfarben-Legende](./statusfarben.md).

```mermaid
stateDiagram-v2
  state "Entwurf" as draft_state
  state "Geplant" as planned_state
  state "Veröffentlicht" as published_state
  state "Papierkorb" as trash_state

  style draft_state fill:#9e9e9e,color:#fff
  style planned_state fill:#1976d2,color:#fff
  style published_state fill:#4caf50,color:#fff
  style trash_state fill:#000000,color:#fff

  [*] --> draft_state

  draft_state --> planned_state: Termin setzen
  draft_state --> published_state: Publish-now
  draft_state --> trash_state: Löschen

  planned_state --> draft_state: Termin entfernen
  planned_state --> published_state: Scheduler sendet
  planned_state --> trash_state: Löschen/Verwerfen

  published_state --> trash_state: Retract oder Löschen

  trash_state --> planned_state: Wiederherstellen
  trash_state --> [*]: Permanent löschen
```

> Wiederkehrende Skeets (`repeat != 'none'`) bleiben nach erfolgreicher Ausführung im Status *Geplant* – der Scheduler berechnet beim Versand automatisch den nächsten Termin.
