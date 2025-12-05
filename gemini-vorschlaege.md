# Verbesserungsvorschläge

Hier sind einige Vorschläge zur Verbesserung der Codebasis, basierend auf einer ersten Analyse.

## 1. Architektonische Entkopplung von `dashboard` und `bsky-client`

**Problem:** Die `dashboard`-Anwendung importiert und rendert die gesamte `bsky-client`-Anwendung. Dies ist ein schwerwiegendes Architektur-Anti-Pattern, das zu einer engen Kopplung, erhöhtem Wartungsaufwand und einer unklaren Projektstruktur führt.

**Fundort:**
- `dashboard/package.json`: Deklariert eine direkte Abhängigkeit von `bsky-client`.
- `dashboard/src/App.jsx`: Importiert und rendert die `bsky-client` App-Komponente.

**Vorschlag:**
Entkoppeln Sie die beiden Anwendungen vollständig.
1.  Identifizieren Sie wirklich gemeinsam genutzten Code (z.B. UI-Komponenten, React-Contexts, Hooks).
2.  Verschieben Sie diesen gemeinsamen Code in ein dediziertes Paket im `packages/` Verzeichnis (z.B. `packages/shared-ui` oder `packages/shared-hooks`).
3.  Lassen Sie sowohl `dashboard` als auch `bsky-client` von diesem neuen Shared-Paket abhängen.
4.  Entfernen Sie die direkte Abhängigkeit von `dashboard` zu `bsky-client`.

**Begründung:** Diese Entkopplung verbessert die Modularität, vereinfacht die Wartung und ermöglicht die unabhängige Entwicklung und Bereitstellung der beiden Frontends.

## 2. Zentralisiertes Abhängigkeitsmanagement auflösen

**Problem:** Die `package.json` im Stammverzeichnis des Projekts enthält Abhängigkeiten (`express`, `sequelize`, `react`, `sqlite3` etc.), die spezifisch für einzelne Workspaces (`backend`, `dashboard`) sind.

**Fundort:**
- `package.json` (Root)

**Vorschlag:**
Verschieben Sie jede Abhängigkeit aus der Root-`package.json` in die `package.json` des Workspaces, der sie tatsächlich benötigt.
- `express`, `sequelize`, `sqlite3` etc. gehören in `backend/package.json`.
- `react`, `react-dom` etc. gehören in `bsky-client/package.json` und `dashboard/package.json`.

**Begründung:** Dies ist das Kernprinzip eines Monorepos mit Workspaces. Jeder Workspace sollte seine eigenen Abhängigkeiten deklarieren, um modular und eigenständig zu sein. Die aktuelle Struktur untergräbt diesen Vorteil, führt zu unklaren Abhängigkeitsbäumen und erschwert die Versionsverwaltung pro Paket.

## 3. Projektweite Inkonsistenzen beheben

**Problem:** Es gibt mehrere Inkonsistenzen im gesamten Projekt, die auf fehlende einheitliche Standards hindeuten.

**Vorschläge:**

### a) Lizenzierung vereinheitlichen
- **Problem:** Die Lizenzen sind inkonsistent. Das Root-Projekt verwendet `ISC`, während `packages/media-pickers` `GPL-3.0-or-later` spezifiziert.
- **Fundorte:** `package.json` (Root), `packages/media-pickers/package.json`.
- **Vorschlag:** Entscheiden Sie sich für eine einheitliche Lizenz für das gesamte Projekt und wenden Sie diese auf alle `package.json`-Dateien an, um rechtliche Unklarheiten zu vermeiden.

### b) Modulsystem vereinheitlichen
- **Problem:** Das Projekt mischt `commonjs` und `module` als `type` in den verschiedenen `package.json`-Dateien.
- **Vorschlag:** Legen Sie einen einheitlichen Modul-Standard für das gesamte Projekt fest (z.B. `module` für ESM) und konfigurieren Sie alle Pakete entsprechend. Dies vermeidet Kompatibilitätsprobleme und vereinfacht das Build- und Test-Setup.

## 4. Fehlende Eingabevalidierungsschicht

**Problem:** Die Controller-Funktionen, insbesondere `createSkeet` und `updateSkeet`, leiten den `req.body` direkt an die Service-Schicht weiter. Obwohl der `skeetService` einige Validierungen durchführt, ist dies ein unsicheres Muster. Die Validierung sollte so früh wie möglich erfolgen, um ungültige oder schädliche Daten von der Geschäftslogik fernzuhalten.

**Fundort:**
- `backend/src/api/controllers/skeetController.js`

**Vorschlag:**
Führen Sie eine dedizierte Validierungs-Middleware für die API-Routen ein. Bibliotheken wie `joi` oder `express-validator` eignen sich hierfür hervorragend.

**Beispiel (mit `express-validator`):**
```javascript
// In skeetRoutes.js
const { body, validationResult } = require('express-validator');

router.post(
  '/',
  // Middleware zur Validierung
  body('content').trim().notEmpty().withMessage('Inhalt darf nicht leer sein'),
  body('scheduledAt').optional({ checkFalsy: true }).isISO8601().toDate(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  skeetController.createSkeet // Controller wird nur mit validierten Daten aufgerufen
);
```

**Begründung:** Dies entkoppelt die Validierung von der Geschäftslogik, macht die Controller schlanker und erhöht die Sicherheit und Robustheit der Anwendung, da die Service-Schicht von validierten Daten ausgehen kann.

## 5. "Fat Service" refaktorieren und Verantwortlichkeiten trennen

**Problem:** Der `skeetService` ist zu einem "Fat Service" geworden, der gegen das Single Responsibility Principle verstößt. Er vermischt reine Geschäftslogik (z.B. Scheduling-Regeln) mit Aufgaben wie direkten, blockierenden Dateisystemoperationen für Bild-Uploads.

**Fundort:**
- `backend/src/core/services/skeetService.js`

**Vorschläge:**
1.  **Dateiverarbeitung auslagern:** Erstellen Sie einen neuen `mediaService.js`, der sich ausschließlich um das Verarbeiten von Medien (Uploads, Speicherung, Löschung) kümmert. Die Methoden in `skeetService` sollten diesen neuen Service aufrufen, anstatt `fs.writeFileSync` direkt zu verwenden.
2.  **Asynchrone I/O verwenden:** Ersetzen Sie blockierende Aufrufe wie `fs.writeFileSync` im neuen `mediaService` durch asynchrone Alternativen (z.B. `fs.promises.writeFile`), um zu verhindern, dass der Node.js-Event-Loop bei Dateioperationen blockiert wird.

**Begründung:** Die Aufteilung in kleinere, fokussierte Services verbessert die Lesbarkeit, Wartbarkeit und Testbarkeit des Codes. Die Verwendung asynchroner I/O ist entscheidend für die Performance und Skalierbarkeit einer Node.js-Anwendung.

## 6. Fehlende Paginierung für Skeet-Listen

**Problem:** Die Funktion `listSkeets` (und der zugehörige Controller `getSkeets`) lädt immer alle Skeets aus der Datenbank. Mit zunehmender Anzahl von Einträgen führt dies unweigerlich zu Performance-Problemen und hohem Speicherverbrauch auf dem Server.

**Fundort:**
- `backend/src/core/services/skeetService.js` -> `listSkeets`
- `backend/src/api/controllers/skeetController.js` -> `getSkeets`

**Vorschlag:**
Implementieren Sie eine Paginierung für diesen Endpunkt.
1.  Der `getSkeets`-Controller sollte Query-Parameter wie `limit` und `offset` akzeptieren.
2.  Diese Parameter werden validiert und an die `listSkeets`-Funktion im Service weitergegeben.
3.  Die Service-Funktion nutzt `limit` und `offset` in der `Skeet.findAll`-Abfrage, um nur einen Teil der Ergebnisse von der Datenbank anzufordern.

**Begründung:** Paginierung ist eine grundlegende Anforderung für alle Listen-Endpunkte, die potenziell viele Daten zurückgeben können. Sie stellt sicher, dass die Anwendung auch mit großen Datenmengen performant und stabil bleibt.

## 7. Frontend-Refactoring: "God-Component" und monolithischen State auflösen

**Problem:** Die Frontend-Anwendung `bsky-client` leidet unter zwei eng miteinander verbundenen Architekturproblemen:
1.  **"God Component":** Die Komponente `ClientApp.jsx` ist für fast die gesamte Anwendungslogik verantwortlich – Routing, Data Fetching, State-Management-Callbacks und das Rendering verschiedener UI-Zustände.
2.  **Monolithischer State:** Der `AppContext` fasst den gesamten globalen Zustand in einem einzigen, großen Objekt zusammen, das von einem manuell implementierten Redux-ähnlichen Muster verwaltet wird.

Dies führt zu extrem schwer wartbarem Code, bei dem kleine Änderungen unvorhersehbare Nebenwirkungen haben können.

**Fundort:**
- `bsky-client/src/ClientApp.jsx`
- `bsky-client/src/context/AppContext.jsx`

**Vorschlag:**
Führen Sie ein umfassendes Refactoring des Frontends durch.

1.  **`ClientApp.jsx` zerlegen:** Brechen Sie die Komponente in kleinere, fokussierte UI-Komponenten auf (z.B. `TimelineView`, `NotificationsView`, `TimelineHeader`).
2.  **Logik in Custom Hooks auslagern:** Kapseln Sie die komplexe Logik für Daten- und Zustandsverwaltung in wiederverwendbaren Custom Hooks. Erstellen Sie beispielsweise einen `useTimelineManager`-Hook, der die komplette Logik für das Fetchen, Pollen und Auswählen von Timelines verbirgt und nur eine einfache API nach außen anbietet (`timeline`, `selectTimeline`, `refresh`).
3.  **State Management modernisieren:** Ersetzen Sie den selbstgebauten `AppContext` durch eine etablierte Bibliothek wie **Redux Toolkit**.
    -   Definieren Sie einzelne "Slices" (`createSlice`) für die verschiedenen Zustandsbereiche (z.B. `timelineSlice`, `composerSlice`).
    -   Verwenden Sie den `useSelector`-Hook in den Komponenten, um gezielt nur auf die Daten zuzugreifen, die sie wirklich benötigen. Dies verhindert unnötige Re-Renders.

**Begründung:** Dieses Refactoring entkoppelt die Komponenten voneinander und trennt die UI von der Geschäftslogik. Die Verwendung von Redux Toolkit bietet eine standardisierte, performante und gut debugbare Lösung für das State Management. Kleinere Komponenten und fokussierte Hooks sind leichter zu verstehen, zu testen und zu warten.
