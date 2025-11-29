# M5 – Iteration 1: Virtualisierung (Infrastruktur)


## Infrastruktur für Virtualisierung implementiert

Die `VirtualizedList` wurde erweitert um:

- interne Scroll- und Viewport-Zustände (`scrollTop`, `viewportHeight`)
- Listener für `#bsky-scroll-container` (Scroll + Resize)
- optionale Virtualisierungs-Props:
  - `itemHeight` (logische Höhe pro Item)
  - `virtualizationThreshold` (Default 100)
  - `overscan` (Default 4)
- Berechnung eines virtuellen Fensters:
  - `startIndex`, `endIndex`, `slice`
  - `paddingTop`, `paddingBottom` als Spacer
- Vollständiger Fallback:
  - Wenn Bedingungen nicht erfüllt → **keine Virtualisierung**
  - komplettes, ursprüngliches `map()`-Verhalten bleibt erhalten
  - `emptyFallback` unverändert
  - `className` + `data-*` + `aria-*` werden weitergereicht

Diese Struktur bildet die **Performance-Basis**, auf der später echte Virtualisierung (mit besserem Höhenmodell) sicher aktiviert werden kann.

---

## Virtualisierung aktuell **nicht aktiv**

Aufgrund stark variierender Skeet-Höhen kommt es beim Scrollen zu sichtbaren Sprüngen.

Daher:

- Die Virtualisierungs-Props (`itemHeight`, `virtualizationThreshold`, `overscan`) wurden in `Timeline.jsx` und `Notifications.jsx` **zunächst wieder entfernt**.
- Der Client nutzt jetzt wieder das vollständige Rendering ohne Windowing.
- Die Infrastruktur bleibt im Code erhalten und ist bereit für zukünftige Feinanpassungen.

Begründung:

- Reale Skeet-Höhen unterscheiden sich stark (Textmengen, Medien-Aspect-Ratios).
- Eine feste logische Höhe führt zu ungenauen Padding-Werten → „Scroll-Jumps“.
- Für eine gute UX muss später entweder  
  **a)** ein kompakter Kartenmodus entstehen  
  oder  
  **b)** Virtualisierung mit dynamischen Item-Höhen.

---

## Offene Punkte für später (nicht Teil von M5)

- Entscheidung: *Compact Timeline Mode* (begrenzte Höhe, Medien-Thumbnails, Text-Clamping)  
  **oder**
- *Dynamic Height Mode* (ResizeObserver + Prefix-Sums für akkurate Spacer).
- Cleanup von `ClientApp.jsx`: `runListRefresh`-Aufruf aus dem Render-Bereich in `useEffect` verschieben (wegen React-Warning).


### Iteration 1.1 – VirtualizedList Cleanup & Debug-Haken

- Die Virtualisierungslogik in `VirtualizedList` wurde robuster gemacht:
  - Virtualisierung wird nur aktiviert, wenn `itemHeight`, `viewportHeight > 0`, ein gültiger Scroll-Container (`#bsky-scroll-container`) und genügend Items vorhanden sind.
  - Bei fehlenden Voraussetzungen fällt die Komponente auf das vollständige Rendering aller Items zurück (altes Verhalten).
  - Fenstergrenzen (start/end) werden auf `0..items.length-1` geklemmt, Spacer-Höhen per `Math.max(0, …)` geschützt; wäre das Fenster leer, werden alle Items gerendert.

- Es wurde ein optionaler Debug-Haken `debugVirtualization` hinzugefügt:
  - Nur im Development-Build aktiv.
  - Wenn Virtualisierung aktiv ist und `debugVirtualization` gesetzt ist, versieht die Liste ihr `<ul>` mit Diagnose-Attributen (Fensterstart/-ende, Totalanzahl etc.) und zeigt ein kleines Overlay mit den aktuellen Virtualisierungsparametern.
  - In Production-Builds und bei nicht aktivierter Virtualisierung bleibt das UI unverändert.
