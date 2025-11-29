# BSky-Kampagnen-Bot – Test-Konventionen

Diese Datei definiert die verbindlichen Richtlinien für das Schreiben, Strukturieren und Platzieren von Tests in diesem Projekt.  
Sie richtet sich an menschliche Entwickler:innen und dient als Referenz, um eine einheitliche Testumgebung sicherzustellen.

---

## 1. Test-Orte und Dateien

### 1.1 Unit- und Integrationstests
Alle Tests müssen in einem `__tests__`-Ordner neben der jeweils getesteten Datei liegen.

**Erlaubte Pfade:**
- `backend/src/**/__tests__/*.test.{js,ts,jsx,tsx}`
- `dashboard/src/**/__tests__/*.test.{js,ts,jsx,tsx}`
- `bsky-client/src/**/__tests__/*.test.{js,ts,jsx,tsx}`

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
| Backend         | `backend/src/.../__tests__/...`               |
| Dashboard       | `dashboard/src/.../__tests__/...`             |
| BSky Client     | `bsky-client/src/.../__tests__/...`           |
| Manuelle Tests  | `docs/tests/...`                              |
