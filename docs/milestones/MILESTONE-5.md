# MILESTONE 5 — Virtualisierung (Performance-Basis)

## Ziel

Virtualisierung der Timeline-Elemente ab 100+ Items, um Performance, Scroll-Flow und Speicherverbrauch zu stabilisieren.  
→ Muss vor Rich Media/UX stehen, damit diese später auf einer robusten Grundlage aufsetzen.

- Bei großen Scroll-Listen (insbesondere Timeline und Notifications) soll der List-View auch bei 100+ Einträgen flüssig bleiben.  
Dazu wird eine einfache Virtualisierung (Windowing) eingeführt, die nur die gerade sichtbaren Items rendert.

---

## Anforderungen

- Virtualisierung greift ab **100 Items** aufwärts.
- Für kleinere Listen (< 100 Einträge) verhält sich der View wie vorher (kein Overhead).
- Scroll-Verhalten bleibt natürlich (keine Sprünge, keine „Lade-Löcher“).
- Funktioniert für:
  - Timeline-Listen
  - Notifications-Listen
  - weitere Listen, sofern sie dieselbe List-Komponente verwenden
---

## Technischer Ansatz

- Verwendung einer Virtual-List-Lösung:
  - Entweder leichte Eigenlösung (Windowing via `scrollTop`, Item-Höhe, `startIndex`/`endIndex`)
  - oder schlanke Library (z. B. `react-window`), sofern ins Projekt-Setup passend
- Konfigurierbarer Schwellwert:
  - Default: `VIRTUALIZATION_THRESHOLD = 100`
- Virtuelle Liste kapseln in einem eigenen Component, z. B.:
  - `<VirtualizedList items={...} renderItem={...} />`

---

## Akzeptanzkriterien

- Bei 200+ Items bleibt Scrollen flüssig (kein merkliches Ruckeln)
- CPU-/Render-Last im Dev-Profilling sichtbar reduziert gegenüber „alles rendern“
- UI-Verhalten:
  - Kein Flackern beim Scrollen
  - Items erscheinen/verschwinden nur am Rand des Viewports (Windowing sichtbar, aber nicht störend)
- Keine Änderung an:
  - Item-Inhalten
  - Klick- und Hover-Verhalten
  - Kontextmenüs/Actions pro Eintrag

---

## Tests / Szenarien

- Test mit 50 Items:
  - Virtualisierung ist **deaktiviert**
  - Liste verhält sich wie vor M6
- Test mit 150–300 Items:
  - Virtualisierung aktiv
  - Scrollbar verhält sich erwartungsgemäß (volle Höhe, kein Springen)
- Filter-/Such-Interaktion (M5):
  - Nach Filterung mit < 100 Ergebnissen wird Virtualisierung automatisch wieder deaktiviert
- Resize des Fensters:
  - Sichtfenster wird korrekt neu berechnet
