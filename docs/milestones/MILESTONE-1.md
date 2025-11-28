# MILESTONE 1 — Codebasis entwirren & Altlasten entfernen

## Ziel des Milestones

Die bestehende Bluesky-Client-Codebasis wird bereinigt, vereinheitlicht und von allen Altlasten befreit.
Das Ergebnis soll ein klarer, wartbarer Ausgangspunkt für alle weiteren Milestones sein.

---

## Issues

### Issue 1 – Codex-Altlasten vollständig entfernen

Reste der alten Codex-Generierungen (Fragment-Code, verlassene Kommentarblöcke, unvollständige Funktionen) müssen entfernt werden, um Übersichtlichkeit und Stabilität zu erhöhen.

#### Akzeptanzkriterien:

- Alle Codex-Fragmente im Code entfernt
- Tote Komponenten/Reducer-Zweige gelöscht
- Projekt baut fehlerfrei und verhält sich wie vorher

---

### Issue 2 – Unbenutzte Komponenten entfernen

Mehrere Komponenten liegen im Repo, werden aber nirgendwo mehr importiert oder genutzt.

#### Akzeptanzkriterien:

- Alle nicht verwendeten Komponenten gelöscht
- Optional: Historisch relevante Komponenten in `archived/` verschieben
- Keine fehlenden Imports im Projekt

---

### Issue 3 – Dateistruktur vereinheitlichen

Die Datei- und Ordnerstruktur soll auf ein klares, konsistentes Modell vereinheitlicht werden.

#### Vorschlag:

```css
src/
  api/
  components/
  context/
  hooks/
  layout/
  utils/
```

#### Akzeptanzkriterien:

- Dateien in eine verständliche, einheitliche Struktur überführt
- Keine doppelten oder verwaisten Files
- Alle Imports angepasst und getestet

---

### Issue 4 – Reducer: doppelte Logik entfernen

Reducer enthalten duplizierte Actions, verwirrende Cases und überflüssige State-Updates.

#### Akzeptanzkriterien:

- Jeder Action-Type existiert nur einmal
- Unerreichbare oder nicht mehr genutzte Cases entfernt
- Reducer klarer und kürzer

---

### Issue 5 – Debug-Code & temporäre Logs entfernen

Entfernen aller Debug-Statements, Test-Logs und temporären Ausgaben.

#### Akzeptanzkriterien:

- Keine `console.log()` Debug-Ausgaben mehr
- Fehlerausgaben nur noch über ein definiertes System
- DevTools-Konsole bleibt beim Start sauber

---

### Issue 6 – Überflüssige Tailwind-Klassen entfernen

Im Laufe der Entwicklung sind überlappende, widersprüchliche oder überflüssige Utility-Klassen entstanden.

#### Akzeptanzkriterien:

- Nicht verwendete Tailwind-Klassen entfernt
- Keine Utility-Konflikte innerhalb derselben Komponente
- Keine verschachtelten scrollbaren Container ohne Notwendigkeit

---

### Issue 7 – Nicht genutzte Helper-Funktionen löschen

Im `utils/`-Bereich liegen nicht mehr genutzte Helferfunktionen.

#### Akzeptanzkriterien:

- Nicht verwendete Helper gelöscht
- Keine `unused export`-Warnungen
- Keine „toten“ Helper-Files mehr

---

### Issue 8 – Einheitliche Benennungs­konventionen

Dateinamen, Komponenten und Helper folgen derzeit uneinheitlichen Mustern.

#### Akzeptanzkriterien:

- Komponenten: PascalCase
- Helper/Utils: camelCase
- Keine Mischung unterschiedlicher Schreibweisen
- Dateiname entspricht Komponentennamen

---

### Issue 9 – State: Alt-Felder entfernen

Verschiedene State-Objekte enthalten Felder, die nicht mehr gelesen oder verändert werden.

#### Akzeptanzkriterien:

- State nur noch relevante Felder
- Entfernte Felder verursachen keine UI-Fehler
- Initial-State ist klar dokumentiert

---

### Issue 10 – Legacy-Code im Thread-View entfernen

Der alte Thread-View enthielt unvollständige Tree-Ansätze und experimentelle Layouts.

#### Akzeptanzkriterien:

- Sämtlicher Legacy-Thread-Code entfernt
- Nur der reduzierte, neue Thread-View bleibt aktiv
- Keine Imports von alten Thread-View-Dateien
