# .codex/AGENTS.md

## Arbeitsvereinbarungen für Codex-Agent:innen

Diese Regeln sind verbindlich. Wenn eine Nutzer:innen-Anweisung im Widerspruch zu diesen Regeln zu stehen scheint, **sofort stoppen** und um Klarstellung bitten.

---

## 1. Zentrale Arbeitsprinzipien

* Handle immer im **kleinstmöglichen Umfang**. Nimm niemals Refactorings oder Optimierungen vor, die über das ausdrücklich Geforderte hinausgehen.
* Wenn du dir über die Absicht der Nutzer:in unsicher bist, **frage nach**, bevor du handelst.
* Wenn Datei- oder Pfadangaben nicht sicher verifiziert werden können, **fordere eine Bestätigung** an, bevor du Änderungen vornimmst.
* **Interaktionsregel bei Rückfragen:** Wenn die Nutzer:in eine Frage stellt oder ausdrücklich eine Einschätzung erbeten hat, musst du zunächst eine **klare Antwort oder Bewertung** geben. Erst nachdem die Nutzer:in dieser Antwort zugestimmt oder ausdrücklich um Umsetzung gebeten hat, darfst du Aktionen ausführen (z. B. Dateien ändern, Skripte/Kommandozeilen ausführen, Migrationsschritte planen).
* Wir sprechen deutsch miteinander

---

## 2. Regeln für Dateianpassungen & Ausgaben

* Beim Ändern von Dateien **keine Diffs ausgeben**.
* Gib stattdessen eine **kurze, klare Zusammenfassung** der vorgenommenen Änderungen.
* Wenn mehrere Dateien betroffen sind, **jede Datei getrennt** zusammenfassen.
* Gib **vollständige Dateiinhalte nur dann** aus, wenn die Nutzer:in dies ausdrücklich verlangt.
* Organisiere oder schreibe bestehende Tests **niemals um**, außer es wird ausdrücklich angewiesen.
* Verschiebe keine Verzeichnisse und **strukturriere das Monorepo nicht um**, ohne ausdrückliche Anweisung.
* Wenn erwartete Ausgaben mehr als **50 Zeilen** umfassen, schreibe sie in eine Datei gemäß dem Projekt-Namensschema, statt sie inline im Chat auszugeben.

---

## 3. Git-Operationen (verbindliche Einschränkungen)

* Wenn ich dich ausdrücklich auffordere, einen konkreten Git-Befehl auszuführen, hat diese Anweisung Vorrang vor den sonstigen Einschränkungen dieses Abschnitts.
* Git-Operationen dürfen **niemals automatisch** ausgeführt werden.
* Folgende Befehle oder äquivalente Aktionen sind **ausnahmslos untersagt**, solange keine ausdrückliche Anweisung oder Zustimmung von mir vorliegt:

  * `git checkout …`
  * `git restore …`
  * `git reset …`
  * `git pull`, `git fetch`, `git merge`, `git add`, `git commit`
  * Änderungen an Branches, Tags oder Historie
* Wenn unklar ist, ob eine Aktion eine Git-Operation auslöst, **sofort nachfragen** und die Ausführung anhalten.
* Git-Kommandos dürfen ausschließlich ausgeführt werden, wenn ich dies **explizit** verlange. Eine stillschweigende Erlaubnis existiert nicht.
* Wenn ein Dateizustand beschädigt wirkt oder widersprüchlich erscheint, ist **nicht** automatisch eine Git-Wiederherstellung vorzunehmen. Stattdessen ist mir eine **präzise Rückfrage** zu stellen.

Diese Regeln sind verbindlich und haben Vorrang vor allen anderen Anweisungen.

--- 

## 4. Repository-Interaktion

* Respektiere die bestehende **Monorepo-Architektur** und folge den dort etablierten Mustern.
* Erstelle oder verändere **keine Datenbankmigrationen**, außer dies wird ausdrücklich verlangt.
* Nimm **keine Annahmen über fehlende Felder** vor, benenne keine Schemaelemente um und generiere keine zusätzlichen Migrationsschritte ohne klare Anweisung.
* Behandle Pakete wie `shared-ui`, `dashboard`, `backend` und `bsky-client` als **eigenständige Module**.

---

## 5. Abhängigkeitsverwaltung

* Frage nach **expliziter Bestätigung**, bevor du neue Produktionsabhängigkeiten hinzufügst.
* Nimm **keine Updates, Löschungen oder Versionsänderungen** von Abhängigkeiten vor, außer dies wird ausdrücklich verlangt.
* Verwende beim Installieren von Abhängigkeiten bevorzugt **`pnpm`**.

---

## 6. Sicherheit, Validierung & Konfliktbehandlung

* Wenn mehr als **fünf Dateien** geändert würden, stelle den geplanten Ansatz zunächst in einer **kurzen Zusammenfassung** vor und hole eine ausdrückliche Bestätigung ein, bevor du fortfährst.
* Vermeide **spekulative Änderungen**, rekonstruierte Architekturen oder Transformationen, die auf Vermutungen beruhen.
* Stoppe und fordere eine **Klarstellung**, wenn Anweisungen unklar, widersprüchlich oder lückenhaft erscheinen.

---

## 7. Erwartungen an das Repository

* Führe nach Änderungen an JavaScript-Dateien immer **`npm test`** und **`npm run lint`** aus.
* Führe **`npm run lint`** aus, bevor ein Pull Request vorbereitet oder vorgeschlagen wird.
* Dokumentiere Verhaltensänderungen an **öffentlichen Utilities** im Verzeichnis `docs/`.

---

## 8. Transparenz

* Bevor du **Änderungen an mehreren Dateien** vornimmst, gib eine **klare, knappe Zusammenfassung** der geplanten Anpassungen.
* Weisen ausdrücklich darauf hin, wenn eine **interne Regel** eine Aktion verhindert hat, und benenne die betreffende Regel so konkret wie möglich.

---

## 9. UI-Konventionen

Stelle sicher, dass UI-Komponenten, Styling-Konventionen, Benennungen und Interaktionsmuster **über alle Pakete hinweg konsistent** bleiben (`dashboard`, `bsky-client`, `shared-ui`). Ändere **keine** UI-Designsysteme, Theme-Logik oder Component-APIs, außer es wird ausdrücklich verlangt.

---

## 10. Erinnerung

* Wenn eine Datei `codex-plans*.md` im Projekt vorhanden ist (z. B. `codex-plans.md`, `codex-plans-backend.md`, `codex-plans-client.md`), **lies sie zu Beginn jeder neuen Session vollständig ein** und verwende ihren Inhalt als Kontext für alle folgenden Schritte.
* Wenn die Nutzer:in im Gespräch „Feierabend“ oder „Gute Nacht“ sagt, **erstelle oder aktualisiere** die passende `codex-plans*.md`-Datei (z. B. `codex-plans.md` im Dashboard-Kontext, `codex-plans-backend.md` im Backend-Kontext) und fasse darin den aktuellen Stand sowie die nächsten konkreten Schritte zusammen.
* Diese Aktion ist eine **zulässige Ausnahme** von den allgemeinen Regeln zur Dateimodifikation und darf **ohne Rückfrage** ausgeführt werden.

---

## 11. Struktur von `codex-plans*.md`

* Wenn eine `codex-plans*.md`-Datei erstellt oder aktualisiert wird, muss **immer** die folgende Struktur in **genau dieser Reihenfolge** eingehalten werden:

  1. Datum (TT.MM.JJJJ)
  2. Status (aktueller Stand, keine To-Dos)
  3. Startpunkt (kurze Einleitung für die nächste Session)
  4. Nächste Schritte (konkrete, umsetzbare To-Dos)
  5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
  6. Abschluss-Check (prüfbare Kriterien, optional)
  7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)

* Codex darf die Struktur **nicht verändern**, keine neuen Abschnitte hinzufügen und die Reihenfolge nicht anpassen.
* „Offene Fragen“ dürfen **nie** als Tasks interpretiert oder automatisch abgearbeitet werden.
