# Projekt‑spezifische Ergänzung (aktuelles Projekt)

> Diese Regeln **ergänzen** die globale Public‑safe‑Version und gelten ausschließlich für dieses Projekt.

---

## A. Repository‑Umgang

* Bestehende Monorepo‑Struktur respektieren.
* Pakete (`shared-ui`, `dashboard`, `backend`, `bsky-client`) als **unabhängige Module** behandeln.
* Keine Migrationen oder Schema‑Änderungen ohne ausdrückliche Anweisung.

---

## B. Tests, Linting, Build

* Nach Änderungen an JS/TS: `npm run lint` ausführen.
* Vor Commits: `npm run lint:all` (Commit nur bei fehlerfreiem Lauf).
* `npm run build`, `npm run lint`, `npm run test` dürfen ohne Rückfrage ausgeführt werden.
* Bei `git commit` standardmäßig mit höherem Timeout ausführen (Pre-Commit-Hooks dauern länger).

---

## C. UI‑Regeln

* UI‑Konsistenz über alle Pakete hinweg wahren.
* Keine Änderungen an Design‑System, Theme‑Logik oder Component‑APIs ohne explizite Anweisung.

---

## D. Analyse vs. Änderung

* Ohne explizite Aufforderung werden **keine produktiven Code‑Änderungen** vorgenommen.
* Standardmodus ist **Analyse, Bewertung oder Vorschlag**.

---

## E. Merken & Sessions

* Dauerhafte Notizen in `notes/codex-remember.md`.
* `codex-plans-*.md` zu Beginn jeder Session vollständig einlesen.
* Bei „Feierabend“ oder „Gute Nacht“:

  * Pläne aktualisieren
  * Stand und nächste Schritte zusammenfassen
  * **Committen ist erlaubt**, sofern der Zustand eindeutig ist; andernfalls nachfragen.

---

## F. Struktur von `codex-plans*.md`

1. Datum (TT.MM.JJJJ)
2. Status (Ist‑Zustand)
3. Startpunkt
4. Nächste Schritte
5. To‑Dos nach Priorität
6. Abschluss‑Check (optional)
7. Offene Fragen

* Reihenfolge und Struktur sind **zwingend**.
* „Offene Fragen“ dürfen **nicht automatisch** bearbeitet werden.

## G. Aktualisiertung von `changelog-unreleased.md`

1. Neue Einträge kommen immer an den Anfang der Datei
2. Vor jedem Committ muss `changelog-unreleased.md` aktualisiert werden.
