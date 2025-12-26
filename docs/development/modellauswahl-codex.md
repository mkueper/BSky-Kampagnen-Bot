# Modell- und Modus-Auswahl für das BSky-Kampagnen-Tool-Projekt

**Leitfaden zur richtigen Modellwahl (ChatGPT/GPT-5.1/Codex) für Diagnose, Implementierung und Planung**

Dieser Leitfaden beschreibt, welche Modelle und Modi bei welchen Aufgaben im Projekt eingesetzt werden sollen.
Er ist für alle Entwickler:innen gedacht, die mit ChatGPT/GPT-5.1 innerhalb des Projekts arbeiten.

---

## 1. Diagnose komplexer Probleme

Z. B.:

* Fehleranalyse im Gesamtrepo
* Stateflow-/Reducer-/Context-Probleme
* Polling- oder SWR-Störungen
* Interaktionsfehler zwischen Komponenten
* Race Conditions

**Verwende:**

* **GPT-5.1 – Agent (full access)**

**Warum:**

* Hat Zugriff auf das gesamte Projekt
* Kann vollständige Querverbindungen erkennen
* Bestens geeignet für Ursachenanalyse
* Kein Codex-Verhalten (macht keine Annahmen über Implementierung)

---

## 2. Fixes, Implementierungen und Code-Generierung

Z. B.:

* Änderungen an Hooks
* Umbau von Reducern
* Anpassungen am UI
* Refactoring
* Schreiben von Migrationen oder DB-Code

**Verwende:**

* **GPT-5.1-Codex-Max – Agent** (für komplexe Aufgaben)
* **GPT-5.1-Codex – Agent** (für normale Implementierungen)

**Warum:**

* Codex ist auf präzise Implementierung trainiert
* Codex-Max versteht größere Dateien am Stück
* Vermeidet unnötige Refactorings
* Präzise und deterministisch

**Sonderfall:**

* Kleine, punktuelle Änderungen → **GPT-5.1-Codex-Mini**

---

## 3. Planung, Strukturierung und Dokumentation

Z. B.:

* Architekturplanung
* Konventionen und Doku
* Strategiediskussionen
* Stilfindung

**Verwende:**

* **S.A.R.A.H. (ChatGPT)** – wie in den regulären Chats

**Warum:**

* Besser für erklärende, kreative und strukturierende Arbeiten
* Kein Implementierungsdruck

---

## 4. Kurzübersicht

| Aufgabe                     | Empfohlenes Modell     | Modus                   |
| --------------------------- | ---------------------- | ----------------------- |
| 🔍 Diagnose / Fehleranalyse | **GPT-5.1**            | **Agent (full access)** |
| 🛠 Fix schreiben (komplex)  | **GPT-5.1-Codex-Max**  | **Agent**               |
| 🛠 Fix schreiben (mittel)   | **GPT-5.1-Codex**      | **Agent**               |
| 🛠 Mini-Fix, 1–2 Zeilen     | **GPT-5.1-Codex-Mini** | **Agent**               |
| 📘 Dokumentation / Planung  | **S.A.R.A.H.**         | Chat                    |

---

## 5. Hinweise

* Diagnose und Implementierung immer klar trennen: erst **GPT-5.1 Diagnose**, dann **Codex Fix**.
* Codex sollte **niemals** für Projekt-Weitanalysen verwendet werden – er versucht sonst, direkt Code zu ändern.
* GPT-5.1 sollte **nicht** zum Schreiben von Codepatches genutzt werden – er tendiert zu Annahmen.
* Für alle Codex-Aufgaben IMMER einen der Anweisungsblöcke (z. B. ui-anweisungen.md, db-anweisungen.md) nutzen.
