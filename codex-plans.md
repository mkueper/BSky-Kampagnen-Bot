# Codex Plan – Dashboard / Info-Dialoge

---

## 1. Datum (TT.MM.JJJJ)

07.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- `InfoDialog` ist als generische Komponente in `@bsky-kampagnen-bot/shared-ui` implementiert (inkl. `closeLabel` für i18n) und in `docs/ui.md` dokumentiert.
- Die Info-Dialoge in `SkeetForm.jsx` („Hinweis: Post-Text“, „Hinweis: Vorschau“) und `ThreadForm.jsx` („Hinweis: Thread-Inhalt“, „Hinweis: Vorschau“) nutzen nun `InfoDialog` mit einheitlichem Layout:
  - schmaler Haupttextblock (`max-w-[52ch]`)
  - abgesetzter Hintergrund (`rounded-2xl bg-background-subtle px-4 py-3`)
  - einheitlicher sekundärer Schließen-Button mit `common.actions.close`.
- Der Cron-Info-Dialog in `ConfigPanel.jsx` wurde auf `InfoDialog` umgestellt und dient als Referenz:
  - Intro-/Erklärungstext im `content`-Block
  - Monospace-Beispiele im `examples`-Slot
  - zusammenfassender Hinweistext.
- Für „Wiederholversuche & Backoff“ existiert jetzt:
  - ein kurzer Inline-Hinweis (`retryInfoInline`) für Normaluser,
  - ein ausführlicher InfoDialog (`retryInfo*`-Texte) für fachlich involvierte Personen.
- Sprachrichtlinie in `docs/ui.md` ergänzt: UI-Texte werden neutral formuliert, direkte Anrede („du“/„Sie“) wird vermieden.
- Alle Änderungen sind über i18n abgedeckt; `npm test` läuft grün durch.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Der InfoDialog-Pattern ist im Dashboard etabliert (Posts-Formulare, Scheduler/Cron, Wiederholversuche & Backoff) und im UI-Guide dokumentiert. In der nächsten Session soll der Fokus auf weiteren Kandidaten im Dashboard liegen (Dashboard-Polling, Zugangsdaten, Import/Export, ggf. Zeitzonen-Erklärung) und auf der Frage, ob `InfoDialog` in anderen Frontends (bsky-client, Admin-Views) eingesetzt werden soll.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

- Dashboard-Polling:
  - Im Abschnitt **Dashboard-Polling** (ConfigPanel) prüfen, ob ein InfoDialog sinnvoll ist, der Intervalle, Backoff, Jitter und Heartbeat für fachlich Interessierte erläutert.
  - Kurzen Inline-Hinweis beibehalten oder ergänzen; Detailerklärung in einen InfoDialog auslagern.
- Zugangsdaten:
  - Im Tab **Konfiguration → Zugangsdaten** prüfen, ob ein InfoDialog „Hinweis zu Zugangsdaten“ ergänzt werden sollte (Bezug der Zugangsdaten, Umgang mit App-Passwörtern/Tokens, Verhalten bei fehlenden Credentials).
- Import/Export:
  - Für Export-/Import-Funktionen prüfen, ob ein InfoDialog „Import & Export“ sinnvoll ist, der Format, Duplikat-Behandlung und ALT-Text-Verhalten kurz beschreibt (parallel zur bestehenden Doku).
- Zeitzonen:
  - Eine knappe Erläuterung zur Zeitzonen-Konfiguration vorbereiten (lokale vs. Server-Zeitzone, zukünftige Verwendung im Scheduler) und entscheiden, ob diese als Inline-Hinweis oder als eigener InfoDialog platziert wird.
- Priorisierung:
  - Obige Kandidaten gemeinsam priorisieren und nur dort umsetzen, wo der Mehrwert klar ist und das Layout von einem ausgelagerten Info-Text profitiert.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Alle Info-Dialoge im Dashboard nutzen `InfoDialog` mit konsistenter Typografie und einheitlichem Schließen-Button.
- Inline-Hinweise sind kurz, neutral formuliert und verweisen inhaltlich konsistent auf die detaillierten InfoDialog-Texte.
- Alle Texte sind in `dashboard/src/i18n/messages.js` gepflegt und folgen den in `docs/ui.md` definierten Sprach- und UI-Richtlinien.
- `npm test` und relevante Frontend-Checks (lokaler Build/Dev-Server) laufen ohne Fehler.

## 6. Offene Fragen (keine Tasks)

- Soll `InfoDialog` auch in weiteren Workspaces (z. B. `bsky-client`) eingeführt werden, oder bleibt der Einsatz zunächst auf das Dashboard beschränkt?
- Gibt es fachliche Anforderungen für zusätzliche InfoDialog-Themen (z. B. Datenschutz/Hinweise zu Logs, Limits pro Plattform), die bei künftigen UI-Iterationen berücksichtigt werden sollen?
