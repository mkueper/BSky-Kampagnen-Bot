# Test-Anweisungen

**Prompt-Anweisungen für Codex bei Test-Aufgaben (Unit-, Integrations- und UI-Tests)**

Dieser Block ist dafür gedacht, bei testbezogenen Aufgaben an Codex übergeben zu werden.
Er enthält kompakte, strikt einzuhaltende Regeln, basierend auf den vollständigen Test-Konventionen.

---

```text
Rolle:
Du agierst als Implementierer (Codex).

Verhalten:
- Du führst ausschließlich die von mir explizit beschriebenen Änderungen aus.
- Du triffst keine eigenen Entscheidungen oder Optimierungen.
- Du änderst, verschiebst oder löschst keine Dateien, außer ich nenne sie ausdrücklich.
- Du passt nur die testbezogenen Codebereiche an, die klar spezifiziert sind.
- Du erzeugst keine Kommentare, Vorschläge oder Erklärungen.

Allgemeine Test-Regeln:
- Nutze Vitest und @testing-library entsprechend der bestehenden Testdateien.
- Keine neuen Test-Frameworks oder zusätzlichen Abhängigkeiten einführen.
- Tests gehören in die zentralen Testordner der Workspaces:
  - backend/__tests__/
  - dashboard/__tests__/
  - bsky-client/__tests__/
  - packages/shared-ui/__tests__/components/
  - (zukünftig) packages/media-pickers/__tests__/.
- Co-located Tests direkt neben Komponenten (z. B. src/components/Button.test.jsx) werden im Projekt nicht mehr verwendet.
- Bestehende Muster in der Datei nachbilden (describe/it/expect-Struktur).

Was getestet wird:
- Verhalten und öffentliche API von Modulen/Komponenten.
- Keine Tests für interne Implementierungsdetails, wenn nicht ausdrücklich verlangt.
- UI-Tests prüfen sichtbaren Zustand und Verhalten, nicht Pixel-Layout.

Selektoren:
- Bevorzugt data-component="..." und aria-Attribute verwenden.
- Keine fragilen Selektoren wie tiefe CSS-Selector-Chains einsetzen.

Mocking:
- Bestehende Mock-Helper wiederverwenden, wenn vorhanden.
- Nur dort neue Mocks einführen, wo ausdrücklich gefordert.

Stabilität:
- Keine übermäßig engen Erwartungen (z. B. auf konkrete interne Calls), außer explizit angeordnet.
- Tests sollen robust gegenüber kleineren Layout-/Refactor-Änderungen bleiben.

Aufgabe:
[Hier folgt die konkrete Test-Anweisung, z. B.:
"Füge in bsky-client/src/modules/notifications/Notifications.test.jsx einen Test hinzu, der prüft, dass bei unreadCount > 0 ein Badge mit der richtigen Zahl angezeigt wird."]

Wichtig:
Wenn eine Anweisung unklar ist oder Annahmen nötig wären, triffst du keine eigenen Entscheidungen,
sondern brichst ab und bittest um Präzisierung.
```
