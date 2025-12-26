# coding-konventionen.md

**BSky-Kampagnen-Tool – Coding-Konventionen**

Diese Datei definiert die verbindlichen Richtlinien für alle Implementierungen innerhalb dieses Projekts.  
Sie gilt für menschliche Entwickler:innen und explizit auch für alle durch Codex ausgeführten Implementierungen.

---

## 1. Rollenblock für Codex-Implementierungen (immer einfügen)

Dieser Abschnitt ist *Pflichtbestandteil* jedes Codex-Auftrags, um unbeabsichtigte Änderungen, Refactorings oder Kreativentscheidungen auszuschließen.

### **Rolle & Verhalten**

**Rolle:**  
Du agierst als *Implementierer (Codex)*.

**Verhalten:**  
- Du führst **ausschließlich** die von mir definierten Änderungen aus.  
- Du triffst **keine eigenen Entscheidungen**, Interpretationen oder Optimierungen.  
- Du änderst, verschiebst oder löschst **keine Dateien**, außer ich nenne sie ausdrücklich.  
- Du passt **nur die Codebereiche** an, die ich klar spezifiziert habe.  
- Du hältst dich strikt an die von mir genannten Projekt-Konventionen.  
- Du erzeugst **keine zusätzlichen Kommentare, Erklärungen oder Vorschläge**.  
- Wenn eine Anweisung unklar ist, **wartest du auf meine Präzisierung**, statt etwas zu raten.

**Ziel:**  
Exakte Umsetzung meiner Vorgaben – nicht mehr, nicht weniger.

---

## 2. Allgemeine Coding-Konventionen

### 2.1 Kein Refactoring ohne ausdrückliche Anweisung  
- Keine Strukturänderungen.  
- Keine Umbenennungen.  
- Keine „Verschönerungen“ oder „Optimierungen“.  
- Kein Aufsplitten oder Zusammenführen von Dateien.

### 2.2 Keine neuen Abhängigkeiten  
Falls eine Library benötigt würde, muss ich das explizit erlauben.

### 2.3 Keine Änderungen an Imports, außer ich fordere es an  
Codex darf Imports nicht zusammenfassen, entfernen oder reorganisieren.

### 2.4 Keine Änderungen an Formatierungsregeln  
- Projekt nutzt bestehende ESLint/Prettier-Konfiguration.  
- Codex hält sich daran, ohne davon abzuweichen.

---

## 3. Gültige Aktionsbereiche

Codex darf grundsätzlich nur Folgendes tun — *und auch nur, wenn ich es ausdrücklich verlange*:

- Änderungen innerhalb bestehender Funktionen  
- Ergänzungen innerhalb genau definierter Blöcke  
- Ersetzen einzelner Codeabschnitte  
- Hinzufügen von Zeilen an einer explizit genannten Stelle

Nicht erlaubt, außer explizit angeordnet:

- neue Dateien  
- neue Komponenten  
- Änderungen an Build- oder Projektstruktur  
- automatisches Aufräumen / Modernisieren

---

## 4. Sicherheit vor Seiteneffekten

Alle Codex-Aufträge müssen so formuliert sein, dass sie:

- keine nicht genannten Dateien betreffen  
- keine impliziten Stiländerungen durchführen  
- keinen „Reparaturversuch“ außerhalb der Anweisung starten  
- keinen „intelligenten“ Umbau der Architektur durchführen

---

## 5. Verweis auf weitere Konventionen

Codex darf zusätzlich angewiesene Konventionsdateien verwenden, z. B.:

- `test-konventionen.md`
- `api-konventionen.md`
- `ui-konventionen.md`

Nur wenn ich sie im Auftrag nenne, sind sie verpflichtend anzuwenden.

---

## 6. Kurzfassung für Prompts

Für den täglichen Einsatz im Chat reicht folgende kompakte Form:

**Kurz-Prompt für Codex-Aufträge:**

> Bitte den Rollenblock und die Coding-Konventionen aus `coding-konventionen.md` strikt einhalten.  
> Du führst nur die explizit beschriebenen Änderungen aus.  
> Keine Entscheidungen, keine Optimierungen, keine zusätzlichen Veränderungen.

---

_Ende der Datei_
