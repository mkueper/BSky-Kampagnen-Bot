# Tests für die Pending-Skeet-Logik

**BSKY-Kampagnen-Tool – Testdokumentation**

Diese Dokumentation beschreibt die Tests, die sicherstellen, dass die neue
`pending_manual`-Logik korrekt funktioniert. Sie dient sowohl als Referenz für
Entwickler:innen als auch als Grundlage für zukünftige Erweiterungen
(z. B. Sende-Historie, Retry-Mechanismen oder komplexere Wiederholungslogik).

---

## 🧩 Hintergrund

Nach einem 24-Stunden-SPAM-Flag wurde der Scheduler so angepasst, dass
**überfällige Skeets nicht mehr automatisch nachgeholt**, sondern in einen
manuell zu bearbeitenden Zwischenstatus (`pending_manual`) verschoben werden.

Diese Tests stellen sicher, dass:

* nichts unerwartet automatisch gepostet wird,
* einmalige und wiederkehrende Skeets korrekt unterschieden werden,
* manuelles „Publish Once“ und „Discard“ verlässlich funktionieren,
* Terminberechnung und Statusübergänge sauber sind.

---

## 📁 Teststruktur

Empfohlene Ordnerstruktur:

```
backend/
└── tests/
    ├── scheduler/
    │   ├── getNextScheduledAt.test.js
    │   └── startupPendingScan.test.js       (optional)
    │
    ├── services/
    │   ├── publishPendingSkeetOnce.test.js
    │   ├── discardPendingSkeet.test.js
    │   └── listPendingSkeets.test.js
    │
    ├── api/
    │   ├── getPendingSkeets.test.js
    │   ├── publishOnceRoute.test.js
    │   └── discardRoute.test.js
    │
    └── helpers/
        └── skeetFactory.js
```

---

## 🏭 Test-Factories

### `skeetFactory.js`

Die Factory erzeugt Skeets mit minimalem Setup und optionalen Overrides:

```js
createSkeet({
  status: 'pending_manual',
  repeat: 'none',
  scheduledAt: new Date(),
  pendingReason: null,
})
```

Factories machen alle Tests verständlicher und stabiler.

---

## 1. Tests für `getNextScheduledAt(skeet, fromDate)`

Datei:
`scheduler/getNextScheduledAt.test.js`

### Ziele

* Korrekte Terminberechnung für daily/weekly/monthly
* Ergebnis liegt **immer** in der Zukunft
* Fehlerhafte Konfiguration wird mit `null` abgefangen

### Wichtige Testfälle

* Daily: gestern 06:00 → tomorrow 06:00
* Weekly: repeatDayOfWeek = 3 (Mi), now = Do → nächster Mi
* Monthly: repeatDayOfMonth = 15, now = 20. → 15. nächsten Monats
* Fehler: unbekanntes repeat / fehlende Felder

---

## 2. Tests für `publishPendingSkeetOnce(id)`

Datei:
`services/publishPendingSkeetOnce.test.js`

### Ziele

* Unterscheidung zwischen einmaligen & wiederkehrenden Skeets
* Korrekte Statusübergänge (pending_manual → sent bzw. → scheduled)
* Korrekte Terminlogik bei Repeatern
* Fehlerfälle sauber abgefangen

### Testfälle

#### Einmalige Skeets (`repeat = 'none'`)

* Erfolgreiche Veröffentlichung → `sent`, `postedAt` gesetzt, `scheduledAt = null`
* Nicht vorhandene ID → Fehler 404
* Falscher Status → Fehler 400

#### Wiederkehrende Skeets (`repeat != 'none'`)

* Erfolgreiches Publish → `scheduled`, `pendingReason = null`, `postedAt = now()`, `scheduledAt > now()`
* Fehler in Posting-Pipeline → Weiterreichen des Fehlers

---

## 3. Tests für `discardPendingSkeet(id)`

Datei:
`services/discardPendingSkeet.test.js`

### Ziele

* Einmalige Skeets werden endgültig verworfen
* Wiederkehrende Skeets springen korrekt zum nächsten Termin

### Testfälle

#### Einmalige Skeets

* `skipped`, `pendingReason = 'discarded_by_user'`, `scheduledAt = null`

#### Wiederkehrende Skeets

* `scheduled`, `pendingReason = null`, `scheduledAt = nextRun (> now)`
* Fehlerfall: getNextScheduledAt liefert `null` → 400, state bleibt unverändert

---

## 4. Tests für `listPendingSkeets()`

Datei:
`services/listPendingSkeets.test.js`

### Ziele

* Nur `pending_manual`-Skeets werden gelistet
* Soft-Delete wird respektiert
* Sortierung wie vorgesehen (`scheduledAt ASC`, dann `createdAt DESC`)

---

## 5. Tests für API-Endpunkte

### Dateien

* `api/getPendingSkeets.test.js`
* `api/publishOnceRoute.test.js`
* `api/discardRoute.test.js`

### Ziele

* Endpunkte führen den Service korrekt aus
* HTTP-Statuscodes korrekt
* Fehlerfälle abgedeckt (404, 400, 500)
* Rückgabe entspricht dem aktualisierten Skeet-Objekt

---

## 🔧 Setup & Teardown

Empfohlene Struktur:

* `beforeAll`: Test-DB initialisieren (SQLite in-memory)
* `beforeEach`: Tabellen truncate, Mocks zurücksetzen
* `afterAll`: DB-Verbindung schließen

---

## 🔌 Mocking

Folgende Funktionen **müssen** gemockt werden:

* `publishSkeetNow`
* `dispatchSkeet`
* `getNextScheduledAt`

Dadurch wird verhindert:

* dass echte Bluesky/ATProto-Uploads ausgelöst werden
* dass Timer/Delays Tests verlangsamen

---

## ✅ Zusammenfassung

Diese Tests decken alle kritischen Pfade der neuen Pending-Logik ab:

* Einmalige vs. wiederkehrende Skeets
* Statusübergänge
* Terminberechnung
* API-Routen
* Scheduler-Interaktionen

Sie sorgen dafür, dass der Scheduler **SPAM-sicher**, stabil und vorhersehbar bleibt – auch nach Downtime oder Blockierungen.

Diese Dokumentation dient als dauerhafte Referenz für zukünftige Entwickler:innen und PR-Reviewer:innen.

```
```
