# Konventionen für Requirements – BSky-Kampagnen-Bot

## ID-Schema

- Funktionale Anforderungen: `BOT-FUNC-XXX`
- Nicht-funktionale Anforderungen: `BOT-NF-XXX`
- Constraints: `BOT-CON-XXX`
- Systemanforderungen: `BOT-SYS-XXX`
- Business-Anforderungen: `BOT-BIZ-XXX`
- Use-Cases: `BOT-UC-XXX`
- Architecture Decision Records: `BOT-ADR-XXX`

XXX = laufende dreistellige Nummer (001–999)

## Schreibregeln

- Jede Anforderung in **eigener Datei**
- Jede Datei beginnt mit einer **ID** und **Kurztitel**
- Anforderungen sollen **testbar**, **eindeutig** und **prüfbar** formuliert sein
- Passive Formulierung vermeiden
- Keine Lösungsbeschreibungen (das gehört in Architektur / ADR)

## Format

```markdown
# BOT-FUNC-001 – Kurztitel

## Beschreibung
…

## Motivation / Begründung
…

## Akzeptanzkriterien
…
```

## Traceability

- Referenzen zwischen Anforderungen durch „Siehe: BOT-…“
- Code-Commits sollen Requirement-IDs enthalten (z. B. `BOT-FUNC-003: …`)
