# BSky-Kampagnen-Bot – Test-Konventionen

Diese Datei definiert die verbindlichen Richtlinien für das Schreiben, Strukturieren und Platzieren von Tests in diesem Projekt.  
Sie richtet sich an menschliche Entwickler:innen und dient als Referenz, um eine einheitliche Testumgebung sicherzustellen.

---

## 1. Test-Orte und Dateien

### 1.1 Unit- und Integrationstests
Jeder Workspace besitzt ein eigenes `__tests__`-Wurzelverzeichnis, unter dem alle automatisierten Tests liegen.

**Aktuelle Testpfade:**
- `backend/__tests__/**/*.test.{js,ts,jsx,tsx}`
- `dashboard/__tests__/**/*.test.{js,ts,jsx,tsx}`
- `bsky-client/__tests__/**/*.test.{js,ts,jsx,tsx}`
- `packages/shared-ui/__tests__/components/**/*.test.{js,ts,jsx,tsx}`
- `packages/media-pickers/__tests__/**/*.test.{js,ts,jsx,tsx}` (geplant, derzeit ohne Tests)

**Beispiel-Glob (pro Workspace):**
- `__tests__/**/*.test.{js,jsx,ts,tsx}`

Co-located Tests direkt neben Komponenten (z. B. `src/components/Button.test.jsx`) werden im Projekt nicht mehr verwendet.

### 1.2 Manuelle Tests / Regressionstests
Alle manuell definierten Testpläne werden **ausschließlich** in Markdown unter `docs/tests/` abgelegt.

---

## 2. Dateinamen-Regeln

Testdateien müssen immer das Schema verwenden:

- `Dateiname`.test.js
- `Input`.test.tsx

Keine alternativen Endungen wie `.spec.js` oder Abwandlungen.

---

## 3. Test-Framework und Bibliotheken

- Als Test-Runner wird **Vitest** verwendet.  
- Für UI-Tests:
  - `@testing-library/react`
  - `@testing-library/dom`
- Keine Snapshots für UI-Komponenten (verhindert fragile Tests).
- Keine benutzerdefinierten Testhelfer, außer projektweit definiert.

---

## 4. Strukturkonventionen

### 4.1 Tests folgen immer dieser Struktur:
- Eine `describe()` pro Komponente oder Funktion.  
- Eindeutige und kurze `it()`-Beschreibung.  
- Klarer Arrange-Act-Assert-Aufbau.  
- Keine doppelten Tests, keine boilerplate-Kopien.

### 4.2 Mocks
- Mocks dürfen nie außerhalb des Testfiles liegen.  
- Keine globalen Mocks über `setupFiles` (Ausnahme: ausdrücklich definierte Projekt-Mocks).

---

## 5. Verbotene Änderungen

Codex und menschliche Entwickler:innen dürfen **nicht**:

- Dateien in andere Ordner verschieben  
- Teststrukturen reorganisieren  
- bestehende Tests „optimieren“ ohne Grund  
- Snapshots einführen  
- die Testumgebung konfigurativ ändern  

---

## 6. Verhalten bei unklaren Fällen

Sollte ein Testfall nicht eindeutig definierbar sein:

- Test **nicht raten**,  
- Test **nicht extrapolieren**,  
- sondern **Rückfrage stellen**.

---

## 7. Kurzreferenz

Tests werden immer dort abgelegt, wo sie logisch hingehören:

| Bereich         | Test-Pfad                                      |
|-----------------|------------------------------------------------|
| Backend         | `backend/__tests__/...`                       |
| Dashboard       | `dashboard/__tests__/...`                     |
| BSky Client     | `bsky-client/__tests__/...`                   |
| Shared-UI       | `packages/shared-ui/__tests__/components/...` |
| Media-Pickers   | `packages/media-pickers/__tests__/...` (Ziel) |
| Manuelle Tests  | `docs/tests/...`                              |
