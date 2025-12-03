# Tests – Shared UI (`packages/shared-ui/__tests__`)

Diese Datei dokumentiert die vorhandenen Tests im Ordner `packages/shared-ui/__tests__`.
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

## packages/shared-ui/__tests__/components/Button.test.jsx

**Komponente/Bereich:** `Button` – generischer UI-Button.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft Rendering mitsamt Standard- und Varianten-Styles.
- Stellt sicher, dass Click-Handler korrekt aufgerufen werden.
- Verifiziert, dass Disabled-Zustände die Interaktion verhindern und visuell gekennzeichnet sind.

**Konzept-Abgleich:** offen

---

## packages/shared-ui/__tests__/components/Card.test.jsx

**Komponente/Bereich:** `Card` – Container-Komponente für Inhalte.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft die Darstellung von Card-Inhalten in verschiedenen Varianten (Padding, Layout).
- Verifiziert, dass zusätzliche Props (z.B. `as`, `className`) korrekt weitergereicht werden.

**Konzept-Abgleich:** offen

---

## packages/shared-ui/__tests__/components/NewPostsBanner.test.jsx

**Komponente/Bereich:** `NewPostsBanner` – Hinweis auf neue Beiträge (z.B. in Timelines).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass der Banner nur angezeigt wird, wenn neue Beiträge vorhanden sind.
- Verifiziert, dass ein Klick auf den Banner die vorgesehene Aktion auslöst (z.B. Scroll/Refresh).

**Konzept-Abgleich:** offen
