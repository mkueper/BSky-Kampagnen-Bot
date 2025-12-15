# Codex Plan – BSky Client / Trennung vom Kampagnen‑Tool

---

## 1. Datum (TT.MM.JJJJ)

13.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Arbeitsmodus: Wir arbeiten aktuell ausschließlich am `bsky-client`. Änderungen in `packages/shared-*` nur, wenn für den Client nötig und dann strikt kompatibel/additiv (keine API‑Brüche, Defaults beibehalten), weil Dashboard/andere Consumer sonst unbeabsichtigt kaputtgehen können.
- Konvention: Bei Änderungen/Neubau von UI‑Bausteinen zuerst in `packages/shared-ui` (bzw. `packages/shared-*`) prüfen, ob es bereits eine passende Komponente/Utility gibt, bevor im `bsky-client` oder `dashboard` etwas dupliziert wird.
- Standalone‑Ausrichtung ist konkret: Der Client nutzt direkte `@atproto/api`‑Calls (kein Backend‑Proxy‑Fallback) für Auth/Session, Timeline, Notifications und Suche.
- Multi‑Account ist im Client verfügbar; beim Account‑Wechsel wird die Navigation auf Home/Discover zurückgesetzt und Discover wird neu geladen (ohne „Hook order“-Probleme).
- Erwähnungen (Notifications-Tab) sind vor Endlos‑Nachladen geschützt: Auto‑Nachladen ist begrenzt und stoppt bei fehlendem Cursor‑Fortschritt.
- Tenor (GIFs) ist lokal im Client konfigurierbar (Toggle + API‑Key in lokalem Client‑Config), und das Posten mit GIF/Emoji/Bild funktioniert in Live‑Tests.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Der `bsky-client` läuft als eigenständiger Bluesky‑Client mit direktem `@atproto/api`, Multi‑Account und stabiler Navigation. Als nächstes klären wir die gewünschte UX für Erwähnungen/Auto‑Paging (aktuell begrenzt) und notieren/planen UI‑Verbesserungen für Login und Thread‑Darstellung.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Import‑Grenzen absichern:
   - Im `bsky-client` alle Imports auf `bsky-client/src/**` und `packages/*` begrenzen; sicherstellen, dass es keine direkten Imports aus `backend/**` oder `dashboard/**` gibt (ggf. kleine ESLint‑Regel oder Projekt‑Konvention ergänzen).

2. API‑Abhängigkeiten sichtbar machen:
   - Alle aktuellen `/api/...`‑Aufrufe im `bsky-client` zentral dokumentieren (Auth/Session, `/api/me`, `/api/bsky/*`, `/api/uploads/*`, `/api/tenor/*`, `/api/client-config`) und im Code klar als „Backend‑Proxy für Bluesky“ kennzeichnen.

3. Standalone-Modus vorbereiten:
   - Ein Konfigurationsflag entwerfen (z. B. `VITE_CLIENT_MODE=backend|standalone`), das langfristig zwischen „Backend‑Modus“ (heutiges Verhalten) und „Standalone‑Modus“ (direkte Bluesky‑API) unterscheidet. Ziel: Schrittweise Entkopplung vom Backend, beginnend mit Auth/Session. Die Umstellung folgt einer festen Reihenfolge, damit jeder Schritt sofort live testbar ist:
     1. Auth & Session (`useBskyAuth`) – erledigt.
     2. Profil (`/api/me`) → Bluesky-Session/Profiles.
     3. Timeline & Notifications → direkte `agent`-Calls.
     4. Engagement (Like/Repost/Bookmark) → `agent.app.bsky.feed.*`.
     5. Threads & Replies → direkte Post-/Reply-Kommandos.
     6. Bookmarks, Blocks, Saved Feeds → direkte APIs.
     7. Uploads/Medien/Tenor → direkte Upload- & Drittanbieter-Integrationen.
     8. Client-Config/Polling → lokale Defaults oder separate Settings.

4. Standalone Auth + API-Layer (Schritt 1):
   - Einen neuen Auth-Store (`useBskyAuth`) implementieren, der `@atproto/api` direkt nutzt, Sessions speichert und UI-Status liefert (unauthenticated/authenticated/loading). Bestehende Hooks (LoginView etc.) darauf umstellen, ohne andere Module zu beeinflussen.

5. Client-Config & .env Bereinigung:
   - In `.env.sample` die Blöcke für Backend/Kampagnen‑Tool vs. `bsky-client` klarer labeln (Ports, VITE‑Variablen), damit künftige Missverständnisse bei Port‑ und Modus‑Konfiguration vermieden werden.

6. ThreadComposer & gemeinsame Utils vorbereiten:
   - `ThreadComposer` als generische Komponente (zunächst im `bsky-client`) entwerfen und dabei Bild-/GIF‑Handling konsequent über gemeinsame Helfer laufen lassen (z. B. Split‑Logik, Komprimierung).
   - Eine neutrale Utils‑Schicht (z. B. `shared-logic`/`shared-utils`) als Ziel für Helfer wie `compressImage` und die Thread‑Segmentierung vormerken, statt diese dauerhaft in `shared-ui` zu belassen.
   - API-Replacements sollen nicht über neue Zwischen-APIs laufen; stattdessen verschieben wir wiederverwendbare Logik bewusst nach `shared-logic`/`shared-ui` und kapseln konkrete Protokolle (Bluesky, Mastodon, …) in kleine Client-Klassen wie den `BskyAgentClient`.

7. README/Developer‑Hinweis:
   - Kurz dokumentieren, dass `bsky-client` und Dashboard getrennte Frontends sind, die nur über `shared-ui`/`shared-logic` verbunden sind, und wie man jeden Teil im Dev‑Modus startet (`dev`, `dev:frontend`, `dev:bsky-client`).
8. Generischen `ThreadComposer` in `shared-ui` vorbereiten:
   - Eine generische UI‑Komponente `ThreadComposer` entwerfen, die über Props wie `value`, `onChange`, `maxLength`, `locale`, `hardBreakMarker` und `onSubmit(segments)` arbeitet und keinerlei Plattform‑ oder Scheduling‑Wissen enthält.
   - Die Split‑Logik nach `shared-logic` auslagern (`splitThread({ text, maxLength, hardBreakMarker })`), so dass Dashboard, `bsky-client` und spätere Mastodon‑Unterstützung die gleiche Logik nutzen können.
   - Im `bsky-client` den heutigen „+“‑Pfad perspektivisch durch einen „Sofort posten“-Einsatz von `ThreadComposer` ersetzen, während das Kampagnen‑Dashboard weiter seinen geplanten Scheduler nutzt.
9. Timeline-Tabs (Client):
   - Tabs für Timeline-Feeds (z. B. Discover/Following/Feeds) sauber definieren und im UI als echte Tabs abbilden (inkl. klarer Active-State, Refresh-Verhalten und Cursor-/Paging-Konsistenz je Tab).

10. Binäre Badges in Timelines konfigurierbar machen:
   - Badges, die neue Inhalte anzeigen, prüfen/aktivieren.
   - Anzeige der binären Badges (z. B. „neu“/Zähler-Badges) in Timeline-Listen als Option unter „Aussehen“ vorsehen (Default wie bisher), damit das UI je nach Preference ruhiger geschaltet werden kann.

11. Anmelde-Dialog erweitern (nicht sofort umsetzen):
   - Kontoauswahl anbieten, um zwischen vorhandenen Accounts wählen zu können (statt nur „neu anmelden“).

12. Composer-Modal verbessern (Idee, nicht sofort umsetzen):
   - Beim Antworten im Composer-Modal oberhalb des Eingabefelds den Post anzeigen, auf den geantwortet wird.

13. Settings-UX vereinheitlichen (Notiz, später entscheiden):
   - Prüfen, ob wir Settings sofort speichern oder ein explizites „Speichern“/„Übernehmen“ benötigen (globaler Speichern-Button vs. Feld-Commit z. B. per Häkchen).

14. Push-UI modularisieren (Notiz, nicht sofort umsetzen):
   - Push-Konfiguration als wiederverwendbaren Baustein nach `packages/shared-ui` auslagern und im `bsky-client` vorerst nicht einbinden, bis ein echtes Push-Setup existiert.

15. Login/Passwortfeld verbessern (Notiz, nicht sofort umsetzen):
   - Im Passwort-Input einen Button „Passwort anzeigen“ ergänzen (Toggle Maskierung).

16. Threads/Unterhaltungen begrenzen (Notiz, nicht sofort umsetzen):
   - Unterhaltungen initial nur bis Tiefe 6 rendern; danach einen Button wie im Bluesky-UI („+ 1 weitere Antwort lesen“) anzeigen, der weitere Antworten nachlädt/aufklappt (erneut bis Tiefe 6, usw.).

17. Erwähnungen/Auto-Paging UX klären (als nächstes):
   - Zielbild festlegen, wie im Original Bluesky: Mentions aus Notifications nachladen, ohne UI‑Sprünge, aber mit klarer Begrenzung/Stop‑Kriterium; aktuelles Verhalten (max. 5 Auto‑Loads) gemeinsam prüfen und ggf. feinjustieren.
   - Dabei das Paging-Verhalten des Originals prüfen (≈30–40 Items vorladen; beim Erreichen der Scroll-Schwelle weitere ≈30–40), insbesondere im Mentions-Tab.

18. Composer: Einfügen aus Zwischenablage:
   - Im Composer das Einfügen von erlaubtem Content zulassen (Text, Emoji, Links, Bilder, GIF; Video ggf. später evaluieren).

19. Unroll: Trennlinien-Option:
   - Im Unroll-Fenster Trennlinien per Option in Einstellungen/Aussehen ein-/ausschaltbar machen.

20. Hover-Kontrast in Dark-Themes:
   - Hover-State so anpassen, dass er in dunklen Themes klar erkennbar ist (z. B. zusätzlicher Rahmen/Outline).

21. Composer nach dem Planen geöffnet lassen (Option):
   - Einstellung ergänzen, mit der sich das Verhalten nach „Post/Thread planen“ steuern lässt (z. B. Checkbox „Im Editor bleiben“); sofern aktiv, bleibt der Nutzer im Planungsmodus und kann direkt den nächsten Post vorbereiten, statt automatisch zu „Geplant/Aktivität“ zu springen.

22. SearchView stabilisieren:
   - Sicherstellen, dass `useSearchContext` nur verwendet wird, wenn der `SearchProvider` aktiv ist (z. B. guard in `ClientApp` oder fallback-Routing), damit der sporadische Fehler „useSearchContext muss innerhalb eines SearchProvider verwendet werden“ endgültig verschwindet.

23. Timeline-Umschaltlogik überprüfen:
   - Das Wechseln zwischen Timeline-Tabs (Home, Discover, Feeds etc.) zeigt aktuell Sprünge und reagiert empfindlich auf Badge-Updates. Gesamte Logik (Scroll-Positionen, Refresh-Verhalten, Badge-Resets) analysieren und stabilisieren.

24. Link-Vorschau-Tipp UX:
   - Im Composer prüfen, wie wir Bluesky’s Verhalten (Link einfügen → Vorschau → Link entfernen) kommunikativ oder technisch abbilden können, damit Nutzer die vollen 300 Zeichen erhalten und Vorschauen optional entfernen können (Hinweis/Tooltip oder automatische Hilfestellung).

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Im `bsky-client` existieren keine direkten Imports aus `backend/**` oder `dashboard/**`; alle geteilten Bausteine kommen aus `packages/*`.
- Jede Stelle, die `/api/...` nutzt, ist eindeutig einem der bekannten Backend‑Endpunkte zugeordnet und als solche erkennbar dokumentiert.
- Ein (noch einfacher) Schalter für einen zukünftigen „Standalone‑Modus“ ist vorbereitet, ohne aktuelles Verhalten zu verändern.
- `.env.sample` und ggf. README erläutern klar, welche Ports und Variablen für Backend/Kampagnen‑Tool vs. `bsky-client` relevant sind.

## 6. Offene Fragen (keine Tasks)

- Soll der `bsky-client` mittelfristig einen vollständigen Standalone‑Modus bekommen, der ohne Backend direkt gegen Bluesky (`@atproto/api`) arbeitet, oder soll der Backend‑Proxy die primäre Betriebsart bleiben?
- Welche Features des heutigen `bsky-client` sind für einen Standalone‑Modus wirklich essentiell (Timeline, Profil, Notifications, Interaktionen) und welche bleiben bewusst Backend‑gebunden (z. B. Upload‑Proxy, Tenor‑Proxy)?
- Wie stabil und öffentlich soll `shared-ui` perspektivisch werden (nur internes Monorepo‑API oder eigenständig versionierte Bibliothek, die auch von einem ausgelagerten Client genutzt werden kann)?
