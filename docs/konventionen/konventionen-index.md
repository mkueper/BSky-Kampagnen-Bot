# Konventionen-Index

**Übersicht aller Entwicklungsrichtlinien für den BSky-Kampagnen-Tool**

Dieser Index dient als zentraler Einstiegspunkt in alle Konventionen- und Anweisungsdateien.
Er zeigt Menschen (und Codex), wo welche Regeln abgelegt sind und wie sie zusammenhängen.

---

## 1. Coding

### 1.1 Konventionen

Datei: `coding-konventionen.md`

* Struktur von Komponenten und Modulen
* Naming-Konventionen
* Dateiorganisation
* Code-Stil, Imports, Props
* Verantwortlichkeiten (Komponenten, Hooks, Services)

### 1.2 Anweisungen (für Codex)

Datei: `coding-anweisungen.md`

* Rolle von Codex
* Präzises Arbeitsverhalten
* Aufgabenrahmen
* Keine Entscheidungen, keine Optimierung

---

## 2. API

### 2.1 Konventionen

Datei: `api-konventionen.md`

* Endpunktstrukturen
* Fehlerobjekte
* Statuscodes
* Input-/Output-Definitionen
* Sicherheitsaspekte

### 2.2 Anweisungen (für Codex)

Datei: `api-anweisungen.md`

* Klare Regeln zur API-Implementierung
* Deterministische Fehler- und Erfolgsobjekte
* Keine Abweichungen oder Optimierungen

---

## 3. UI (Dashboard & BSky-Client)

### 3.1 Konventionen

Datei: `ui-konventionen.md`

* Komponentenarchitektur
* Styling und Theming
* Bausteine aus shared-ui
* Pane-Modell (NAV, Content, Detail)
* UX-/A11y-Standards
* API-Integration in UI

### 3.2 Anweisungen (für Codex)

Datei: `ui-anweisungen.md`

* Minimal & regelbasiert
* Kompakte Tailwind- & Hook-Regeln
* Keine eigenen Entscheidungen

---

## 4. Datenbank

### 4.1 Konventionen

Datei: `db-konventionen.md`

* Tabellen- und Spaltenregeln
* Migrationen
* Queries
* Transaktionen
* Fehlerbehandlung

### 4.2 Anweisungen (für Codex)

Datei: `db-anweisungen.md`

* Schemaänderungen nur per Migration
* snake_case
* Parameterisierte Queries
* Keine Geschäftslogik in Migrationen

---

## 5. Tests

### 5.1 Konventionen

Datei: `test-konventionen.md`

* Testtypen
* Selektoren
* Struktur von Mocking & Fixtures
* UI-Testprinzipien
* Abdeckung

### 5.2 Anweisungen (für Codex)

(Geplant – wird später ergänzt)

---

## 6. Gemeinsame Prinzipien

* Keine Datei ohne klaren Zweck
* Keine redundant gepflegten Codepfade
* Keine stillen Änderungen (immer Migrationen / committete Konventionen)
* Konventionen haben Vorrang vor Gewohnheit
* Codex erhält **niemals** die Konventionen selbst, sondern nur die zugehörigen **Anweisungen**

---

*Ende der Datei*
