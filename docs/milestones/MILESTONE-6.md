# MILESTONE 6 — Rich Media & Composer UX

## Ziel des Milestones

Überarbeitung der Medien-Anzeige und der Composer-Bedienung. Saubere Darstellung, **stabiles** Focus-Handling, vereinheitlichte UX.  
→ Aufbauend auf der stabilisierten Timeline/Virtualisierung.

- Der Composer soll neben Bildern auch Videos unterstützen.  
- Medien verwenden ein gemeinsames Einfüge-Modal.  
- Zusätzlich können Medien und Texte direkt aus der Zwischenablage eingefügt werden.

Fokus: **komfortables, konsistentes und regelkonformes Medienhandling**.

---

## Issues

### Issue 1 – Gemeinsames Medien-Modal (Bilder & Videos)

Ein einziges Modal dient zum Einfügen aller Medienarten.

#### Akzeptanzkriterien:

- Einheitliches Modal „Medien einfügen“
- Unterstützt Bilder **und** Videos
- Auswahl über Datei-Dialog
- Vorschau (Thumbnail/Poster) + Dateiname + Entfernen-Button
- Einhaltung der Bluesky-Regeln:
  - **max. 4 Bilder** oder **max. 1 Video**
  - nie beides gleichzeitig
- Konsistente Darstellung im Composer
- Fehlermeldungen statt silent errors

---

### Issue 2 – Video-Unterstützung (Upload & Anzeige)

Der Composer kann ein Video annehmen, validieren und anzeigen.

#### Akzeptanzkriterien:

- Upload eines einzelnen Videos möglich
- Unterstützte Video-Formate werden geprüft
- Vorschau bzw. Video-Icon im Composer sichtbar
- Größen-/Formatfehler werden UI-seitig angezeigt
- Wenn bereits ein Video vorhanden ist:
  - keine weiteren Medien zulässig
  - Fehlermeldung bei Versuch, Bilder oder weiteres Video hinzuzufügen

---

### Issue 3 – Medien-Einfügen über Zwischenablage (Clipboard)

Medien können direkt per `Ctrl+V` eingefügt werden.

#### Akzeptanzkriterien:

- `Ctrl+V` im Composer:
  - Text wird als reiner Text eingefügt
  - Bilder/Videos im Clipboard als Blob erkannt
- Medien-Clipboard-Einfügen nutzt dieselbe Validierung wie Datei-Uploads
- Zwei Modi:
  - **Default:** Medien werden direkt zu den Anhängen hinzugefügt
  - **Optional:** Stattdessen öffnet sich das Medien-Modal
- Bluesky-Medienregeln (4 Bilder / 1 Video) gelten auch hier
- Fehlermeldung bei Regelverstoß

---

### Issue 4 – Medienliste im Composer (UI-Integration)

Die eingebundenen Medien werden klar und einheitlich **innerhalb des Composer-Modals** angezeigt – direkt unterhalb des Texteingabebereichs.

#### Akzeptanzkriterien:

- Medien erscheinen im Composer-Modal unterhalb der Textbox
- Einheitliche Darstellung für Bilder & Videos (Liste oder Grid)
- Entfernen einzelner Medien jederzeit möglich
- Medien-Elemente zeigen:
  - Vorschau/Thumbnail bzw. Video-Icon
  - Dateiname
  - Medientyp (Bild/Video)
- Medienliste stört nicht die Eingabe im Composer

---

### Issue 5 – Settings für Medien-Handling (optional, später)

Komfortoptionen zur Steuerung des Verhaltens beim Einfügen.

#### Akzeptanzkriterien:

- Einstellung:  
  **„Medien aus Zwischenablage automatisch anhängen“** → an/aus
- Einstellung:  
  **„Beim Clipboard-Einfügen Medien-Modal öffnen“** → an/aus
- Einstellungen werden persistent gespeichert

---

### Issue 6 – Unterstützung zukünftiger Features (Platzhalter)

Das System soll offen für spätere Erweiterungen bleiben.

#### Akzeptanzkriterien:

- Code-Struktur erlaubt zukünftige Features wie:
  - Drag & Drop von Medien
  - Reordering der Medien
  - Zuschneiden/Trimmen von Bildern/Videos (falls Bluesky dies erlaubt)
- Keine Architekturentscheidungen verhindern spätere Erweiterungen

---

### Issue 7 – UI-/UX-Testkriterien

Sicherstellen, dass Medienhandling robust und alltagstauglich ist.

#### Akzeptanzkriterien:

- Test: Einfügen von 4 Bildern → funktioniert
- Test: 5. Bild → Fehlermeldung
- Test: Video + Bild → Fehlermeldung
- Test: Video und danach zweites Video → Fehlermeldung
- Test: Einfügen von Medien über Clipboard funktioniert wie Datei-Upload
- Test: Entfernen aller Medien setzt Zustand vollständig zurück

---

### Issue 8 – Error-Handling & Accessibility

Fehler und Zustände müssen klar kommuniziert werden.

#### Akzeptanzkriterien:

- Sichtbare Fehlermeldungen bei ungültigen Medien
- ARIA-Rollen für:
  - Medienliste
  - Entfernen-Buttons
  - Modal-Elemente
- Klare Fokusführung beim Öffnen/Schließen des Modals

---

### Issue 9 – Dokumentation

Kurzbeschreibung der Medienfunktionen für Entwickler:innen und Nutzer:innen.

#### Akzeptanzkriterien:

- Markdown-Datei: `docs/milestones/MEDIA-FEATURE-NOTES.md`
- Enthält:
  - Regeln für Bilder/Videos
  - Verhalten bei Clipboard-Einfügen
  - Modal-Features
  - Übersicht bekannter Einschränkungen (z. B. max. 1 Video)
