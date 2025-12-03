# Tests – Dashboard (`dashboard/__tests__`)

Diese Datei dokumentiert die vorhandenen Tests im Ordner `dashboard/__tests__`.
Jeder Abschnitt beschreibt eine Testdatei, die zugehörige Komponente bzw. den fachlichen Bereich,
die fachlichen Anforderungen (Architektur/Fachkonzept) und die aus der Implementierung abgeleiteten Anforderungen.
Neue Tests sollten durch Hinzufügen eines weiteren Abschnitts im selben Format ergänzt werden
(Überschrift `## <Pfad>`, Komponente/Bereich, **Anforderungen (Architektur/Fachkonzept)**,
**Anforderungen (aus Implementierung)**, **Konzept-Abgleich**).

**Vereinbarung:** Diese Datei dient als fachliche Referenz für Änderungen am Code.
- Dokumentarische Anpassungen (Beschreibungen, Ergänzungen der Anforderungen) sind erlaubt.
- Wenn für eine Komponente der Block `**Anforderungen (Architektur/Fachkonzept):**` fehlt oder nur `**TBD**` enthält,
  DÜRFEN Agenten daraus keine Implementierungsänderungen (Code/Tests) ableiten und MÜSSEN den Auftraggeber auf die fehlende fachliche Definition hinweisen.

---

## dashboard/__tests__/components/PublishedSkeetList.test.jsx

**Komponente/Bereich:** `PublishedSkeetList` – Liste der veröffentlichten Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass bei wenigen Einträgen alle Skeets ohne Virtualisierung angezeigt werden.
- Verifiziert, dass bei langen Listen Virtualisierung aktiviert wird und die Anzahl gerenderter Cards begrenzt ist.
- Stellt sicher, dass ein `ResizeObserver`-Mock verwendet wird, um das Virtualisierungsverhalten deterministisch zu testen.

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/components/SkeetHistoryPanel.test.jsx

**Komponente/Bereich:** `SkeetHistoryPanel` – Anzeige der Sendehistorie eines Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass das Panel bei `repeat='none'` oder fehlender `skeetId` nicht gerendert wird.
- Prüft Lade- und Fehlerzustände anhand der Rückgabe von `useSkeetHistory`.
- Stellt sicher, dass bei erfolgreichem Laden die einzelnen History-Einträge inklusive Status („Erfolgreich“, „Fehlgeschlagen“) und Fehlermeldungen angezeigt werden.

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/hooks/useSkeetHistory.test.jsx

**Komponente/Bereich:** Hook `useSkeetHistory` – Client-seitiges Laden der Sendehistorie.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass kein Request ausgeführt wird, wenn `enabled=false` oder `skeetId` fehlt.
- Verifiziert, dass erfolgreiche Antworten von `/api/skeets/:id/history` korrekt in `data` gemappt werden.
- Stellt sicher, dass `isError` bei fehlgeschlagenen Requests gesetzt und `data` geleert wird, sowie Logging via `console.warn` erfolgt.

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/hooks/useSkeets.test.js

**Komponente/Bereich:** Hook `useSkeets` – Laden und Polling von Skeets im Dashboard.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass Skeets von `/api/skeets` geladen, normalisiert und in den lokalen State übernommen werden.
- Verifiziert die Logik zur Erkennung „bald fälliger“ Skeets (Boost-Window rund um `scheduledAt`) für das Polling.
- Stellt sicher, dass Fehler und Rate-Limits korrekt gehandhabt werden (Backoff, Fehlermeldungen).

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/hooks/useThreads.scheduling.test.js

**Komponente/Bereich:** Hook `useThreads` – Fokussiert auf Scheduling- und Status-Aspekte.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass `scheduledThreads` nur Threads mit `status === 'scheduled'` enthält.
- Prüft, dass Threads mit `scheduledAt` sowohl in der nahen Vergangenheit als auch Zukunft in `scheduledThreads` erscheinen und damit für den Versand berücksichtigt werden.

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/hooks/useVirtualList.test.jsx

**Komponente/Bereich:** Hook `useVirtualList` – generische Virtualisierungsthreads für Listen.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass die virtuellen Indizes abhängig von Containergröße und Scrollposition korrekt berechnet werden.
- Stellt sicher, dass Änderungen von Containerhöhe/Scrollposition die sichtbaren Items aktualisieren.

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/utils/timeUtils.test.js

**Komponente/Bereich:** `timeUtils` – Datums-/Zeit-Helfer für geplante Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass `getRepeatDescription` für verschiedene `repeat`-Arten (none/daily/weekly/monthly) verständliche Beschreibungen liefert.
- Stellt sicher, dass `getDefaultDateParts` einen sinnvollen Standardtermin (morgen 09:00 Uhr) zurückgibt.

**Konzept-Abgleich:** offen

---

## dashboard/__tests__/utils/weekday.test.js

**Komponente/Bereich:** `weekday`-Utils – Wochentagsreihenfolge und Labels.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass `weekdayOrder` für `de-DE` montags startet und für `en-US` sonntags.
- Prüft, dass `weekdayLabel` lokalisierte Wochentagslabels erzeugt (kurz/lang) und die erwarteten Namen enthält.

**Konzept-Abgleich:** offen
