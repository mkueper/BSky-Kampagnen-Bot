# MILESTONE 4 — Thread-Ansicht: einfache, saubere Version

## Ziel des Milestones

Der Thread-View zeigt Threads **klar und minimalistisch** an:

- Fokus auf dem Hauptpfad (Root → direkte Replies → Replies darauf)
- Marker für Abzweigungen, aber keine komplexe Baum-UI
- Saubere Integration in das bestehende Pane-Layout
- Klar definiertes Verhalten beim Öffnen/Schließen
- Ein einfaches Unroll-Modal zur Ansicht von Thread-Abzweigungen ist bereits vorhanden und bleibt bewusst minimal gehalten.
- Es dient ausschließlich der Darstellung und ermöglicht kein komfortables Kopieren kompletter Threads.

---

## Issues

### Issue 1 – Datenmodell für Thread-View definieren

Definieren, welche Daten der Thread-View wirklich braucht  
(z. B. rootPost, replies, branchCount, isBranch).

#### Akzeptanzkriterien:

- Klarer Typ/Interface für Thread-Daten (Root + Liste von Posts)
- Unnötige Felder aus der API werden im View nicht weitergereicht
- Thread-View erhält alle Daten über eine einzige, klar definierte Prop/State-Struktur

---

### Issue 2 – Minimaler Thread-View: Hauptpfad

Implementierung einer reduzierten Thread-Ansicht, die den Hauptpfad darstellt  
(Root → direkte Antworten → Antworten darauf), ohne Tree-Layout.

#### Akzeptanzkriterien:

- Root-Post oben, darunter die Antworten linear
- Einfache, gut lesbare Darstellung der Beiträge (Autor, Zeit, Text)
- Keine komplexe Baum-/Indent-Logik

---

### Issue 3 – Marker für Branches / Abzweigungen

Abzweigungen im Thread sollen markiert werden, ohne den ganzen Branch auszuklappen.

#### Akzeptanzkriterien:

- Beiträge mit weiteren Unterantworten erhalten einen Marker  
  (z. B. „+ X weitere Antworten“)
- Kein automatisches Anzeigen kompletter Unterzweige
- Marker-Design ist konsistent mit dem Layout-Guide

---

### Issue 4 – Öffnen des Thread-Views aus der Timeline

Threads aus der Timeline müssen immer im Thread-Pane landen.

#### Akzeptanzkriterien:

- Klick auf „Thread anzeigen“ o. Ä. öffnet den Thread im Detail-Pane
- Timeline bleibt im Hintergrund unverändert
- Der Thread ist eindeutig als eigener View sichtbar (Titel/Abgrenzung)

---

### Issue 5 – Schließen / Zurück-Navigation des Thread-Views

Definiertes Verhalten beim Schließen des Thread-Views.

#### Akzeptanzkriterien:

- Schließen-Button oder -Icon vorhanden
- Rückkehr zur exakt vorherigen Timeline/Position
- Kein ungewolltes Neu-Laden oder Scroll-Jump

---

### Issue 6 – Kopier-/Markierverhalten im Thread-View

Es soll nicht möglich sein, den Inhalt des **Thread-Content-Bereichs** zu markieren/kopieren.  
Einzelne Posts können ausschließlich über „Post-Text kopieren“ im Footer kopiert werden.

#### Akzeptanzkriterien:

- Markieren/Kopieren **nur im Thread-Content-Bereich** deaktiviert
- Kopieren von Posts nur über den Menü-Eintrag „Post-Text kopieren“
- Verhalten klar dokumentiert und bewusst festgelegt

---

### Thread-Erkennung für Unroll

Ein Thread gilt als „zusammenhängend“ und wird im Unroll-Modal berücksichtigt, wenn:

- Der betrachtete Post `parent === self` ist (Start eines Self-Threads).
- Das erste direkte Child im replyGraph (`replyGraph.children[0]`)  
  ebenfalls vom gleichen Author (`self`) stammt.
- Spätere eigene Beiträge (z. B. nach Antworten anderer) gelten als Ergänzungen  
  und erscheinen **nicht** im Unroll.

**Konfigurierbares Verhalten (später):**

- Spätere Self-Replies im Unroll anzeigen?
  - `nie` (Default)
  - `nur direkt am Hauptzweig`
  - `immer`

---

### Issue 7 – Layout-Anpassung an NAV/Content/Detail-Pane

Thread-View muss sich in das bestehende Pane-Konzept einfügen.

#### Akzeptanzkriterien:

- Thread-View läuft konsistent im „Detail-Pane“
- Keine eigenen Scroll-Container, die globale Layout-Regeln verletzen
- Responsives Verhalten geprüft (kein horizontaler Scroll, keine Überlappung)

---

### Issue 8 – Fehler- und Ladezustände im Thread-View

Beim Laden müssen definierte Lade- und Fehlerzustände sichtbar sein.

#### Akzeptanzkriterien:

- Loading-State (Spinner/Placeholder) beim ersten Öffnen
- Fehleranzeige bei fehlgeschlagenem Laden
- Keine Silent-Fails

---

### Issue 9 – Performance bei langen Threads

Lange Threads dürfen den Client nicht unbenutzbar machen.

#### Akzeptanzkriterien:

- Maximale Anzahl von Beiträgen (Soft-Limit + optionales Nachladen)
- Keine massiven Re-Renders
- Scrollen bleibt flüssig

---

### Issue 10 – Doku & UX-Hinweise zum Thread-View

Kurz dokumentieren, was der Thread-View in M4 kann und was bewusst nicht.

#### Akzeptanzkriterien:

- Markdown-Notizdatei, z. B. `docs/milestones/THREAD-VIEW-NOTES.md`
- Enthält:
  - Ziel des minimalen Thread-Views
  - Verhalten bei Branches
  - Navigationsverhalten
  - Hinweis auf mögliche spätere Tree-UI
