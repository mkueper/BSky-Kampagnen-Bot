# Lebenszyklus – Skeet

Das Zustandsdiagramm zeigt die Status eines einzelnen Skeets und die wichtigsten Übergänge. Die Farben orientieren sich an der [Statusfarben-Legende](./statusfarben.md).

```mermaid
stateDiagram-v2
  state "Entwurf" as draft_state
  state "Geplant" as scheduled_state
  state "Ausstehend (manuell)" as pending_state
  state "Gesendet" as sent_state
  state "Verworfen" as skipped_state
  state "Fehler" as error_state
  state "Papierkorb" as trash_state

  style draft_state fill:#9e9e9e,color:#fff
  style scheduled_state fill:#1976d2,color:#fff
  style pending_state fill:#ff9800,color:#000
  style sent_state fill:#4caf50,color:#fff
  style skipped_state fill:#000000,color:#fff
  style error_state fill:#f44336,color:#fff
  style trash_state fill:#000000,color:#fff

  [*] --> draft_state

  draft_state --> scheduled_state: Termin setzen
  draft_state --> trash_state: Löschen
  draft_state --> sent_state: Publish-now (sofort senden)

  scheduled_state --> draft_state: Termin entfernen
  scheduled_state --> sent_state: Scheduler sendet (einmaliger Skeet)
  scheduled_state --> scheduled_state: Scheduler sendet (wiederkehrend, nächster Termin)
  scheduled_state --> error_state: Versand fehlgeschlagen
  scheduled_state --> pending_state: Scheduler-Start mit verpasstem Termin
  scheduled_state --> trash_state: Löschen/Verwerfen

  pending_state --> sent_state: Publish Once (einmaliger Skeet)
  pending_state --> scheduled_state: Publish Once (wiederkehrend, Turnus bleibt)
  pending_state --> skipped_state: Discard (einmaliger Skeet)
  pending_state --> scheduled_state: Discard (wiederkehrend, nächster Termin)
  pending_state --> trash_state: Löschen

  error_state --> scheduled_state: Fehler behoben / neu planen
  error_state --> trash_state: Löschen

  sent_state --> trash_state: Retract oder Löschen

  skipped_state --> trash_state: Löschen

  trash_state --> scheduled_state: Wiederherstellen (sofern Termin gesetzt)
  trash_state --> draft_state: Wiederherstellen (ohne Termin)
  trash_state --> [*]: Permanent löschen
```

> Wiederkehrende Skeets (`repeat != 'none'`) verbleiben nach einem regulären Versand im Status *Geplant* (*scheduled*); der Scheduler berechnet beim Versand automatisch den nächsten Termin. Verpasste Wiederholungen landen beim Scheduler-Start in *pending_manual* (*Ausstehend (manuell)*) und können von dort aus einmalig gesendet oder verworfen werden.
