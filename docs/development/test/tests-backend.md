# Tests – Backend (`backend/__tests__`)

Diese Datei dokumentiert die vorhandenen Backend-Tests im Ordner `backend/__tests__`.
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

## backend/__tests__/api/authController.test.js

**Komponente/Bereich:** Auth-Controller (`authController`) für Session-Status, Login und Logout.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Der Auth-Controller MUSS den Authentifizierungsstatus korrekt melden (nicht konfiguriert, nicht eingeloggt, eingeloggt).
- Er MUSS Login-Payloads validieren und bei fehlenden Pflichtfeldern geeignete Fehlercodes zurückgeben.
- Bei erfolgreichem Login MUSS eine Session erstellt, persistiert und in der Antwort kommuniziert werden.
- Er MUSS Logout-Anfragen verarbeiten, Sessions zuverlässig löschen und eine konsistente Bestätigung liefern.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/authRoutes.test.js

**Komponente/Bereich:** Express-Routen für Authentifizierung (`/api/auth/*`).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die Routen `/session`, `/login`, `/logout` MÜSSEN mit den korrekten HTTP-Methoden bereitstehen.
- Jede Route MUSS mit der vorgesehenen Controller-Funktion verdrahtet sein.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/bskyApi.test.js

**Komponente/Bereich:** Bluesky-API-Proxy-Routen im Backend.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Eingehende Proxy-Anfragen MÜSSEN validiert und mit den erwarteten Parametern an die Bluesky-API weitergeleitet werden.
- Fehler und Rate-Limits der externen API MÜSSEN in aussagekräftige Fehlerantworten an den Client übersetzt werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/clientConfig.test.js

**Komponente/Bereich:** Endpoint `/api/client-config` für die Dashboard-/Client-Konfiguration.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die Route MUSS die Client-Konfiguration aus `config.CLIENT_CONFIG`, Datenbank-Overrides (Client-Polling/General Settings) und Laufzeitinformationen (z. B. `needsCredentials`, `platforms.mastodonConfigured`, `gifs.tenorAvailable`) zusammenführen.
- Die ausgelieferte Konfiguration DARF keine sensiblen Daten (Secrets) enthalten und MUSS ausschließlich nicht-sensitive Werte (Polling, Locale/Zeitzone, Limits, Feature-Flags) exponieren.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/clientPollingApi.test.js

**Komponente/Bereich:** Polling-Konfigurations- und Status-Endpunkte für Dashboard-Clients.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die API MUSS konfigurierte Polling-Intervalle und Backoff-Werte für Clients bereitstellen.
- Ungültige oder unvollständige Anfragen MÜSSEN mit passenden Fehlercodes beantwortet werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/credentialsApi.test.js

**Komponente/Bereich:** API rund um Zugangsdaten (Bluesky/Mastodon) für den Bot.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die API MUSS das Anlegen, Aktualisieren und Auslesen von Zugangsdaten unterstützen.
- Sensible Felder (z.B. Passwörter, Tokens) DÜRFEN dem Client nicht im Klartext zurückgegeben werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/discardRoute.test.js

**Komponente/Bereich:** Route zum Verwerfen oder Zurücksetzen geplanter Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die Route MUSS geplante Skeets so verwerfen können, dass diese nicht mehr als „scheduled“ gelten.
- Je nach Operation MUSS `scheduledAt` auf `null` gesetzt oder auf einen neuen Wert aktualisiert werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/eventsSse.test.js

**Komponente/Bereich:** Server-Sent Events (SSE) für Status-Updates im Dashboard.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die SSE-Route MUSS Streams korrekt initialisieren und Events im vereinbarten Format senden.
- Verbindungsabbrüche und Fehler MÜSSEN erkannt und ohne Absturz des Servers behandelt werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/getPendingSkeets.test.js

**Komponente/Bereich:** Endpoint zur Abfrage ausstehender („pending“) Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die Pending-API DARF nur Skeets mit passenden Status-/Zeitkriterien zurückliefern.
- Gelöschte Skeets DÜRFEN nicht in der Pending-Liste erscheinen, die Ergebnisse SOLLEN sinnvoll sortiert sein.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/getSkeetHistory.test.js

**Komponente/Bereich:** API-Route für die Sendehistorie eines Skeets (`/api/skeets/:id/history`). 

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die Route MUSS `skeetService.getSkeetSendHistory` verwenden und dessen 404-Fehler korrekt in HTTP-Fehlercodes übersetzen.
- Zurückgelieferte History-Einträge MÜSSEN im erwarteten Schema und absteigend nach `postedAt` sortiert sein.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/maintenanceCleanup.test.js

**Komponente/Bereich:** Wartungs-Endpunkte zur Bereinigung von Alt-Daten.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Cleanup-Endpunkte DÜRFEN nur mit korrekten Berechtigungen aufrufbar sein.
- Beim Aufruf MUSS der jeweils konfigurierte Bereinigungsjob angestoßen werden und eine verständliche Antwort erzeugt werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/mediaController.test.js

**Komponente/Bereich:** Controller & Routen für Medienuploads und -verwaltung.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft Upload, Auflistung und Löschung von Medienobjekten inkl. Fehlerpfaden.
- Stellt sicher, dass Dateigrößen, Mime-Typen und Zuordnungen zu Skeets/Threads korrekt gehandhabt werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/publishNowApi.test.js

**Komponente/Bereich:** API zum sofortigen Veröffentlichen eines Threads („Publish Now“).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass Threads über den Endpoint direkt in den Versand gegeben werden.
- Prüft, dass ungültige IDs, fehlende Segmente oder unzulässige Status mit passenden Fehlercodes beantwortet werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/publishOnceRoute.test.js

**Komponente/Bereich:** Route, die einen geplanten Skeet für eine einmalige Ausführung konfiguriert.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass `scheduledAt` korrekt gesetzt bzw. angepasst wird, wenn ein Skeet nur einmalig gesendet werden soll.
- Stellt sicher, dass bereits verworfene oder gelöschte Skeets nicht erneut geplant werden können.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/requireAuth.test.js

**Komponente/Bereich:** Auth-Middleware `requireAuth` für Backend-Routen.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Stellt sicher, dass Requests abgelehnt werden, wenn das Auth-System nicht konfiguriert ist.
- Prüft, dass Requests ohne gültige Session abgewiesen werden.
- Verifiziert, dass bei gültiger Session `req.session` gesetzt und `next()` aufgerufen wird.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/settingsApi.test.js

**Komponente/Bereich:** API für Konfigurations- und Scheduler-Einstellungen.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft das Auslesen und Aktualisieren von Scheduler-/Plattform-Einstellungen über HTTP.
- Stellt sicher, dass Eingaben validiert und nur erlaubte Schlüssel verändert werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/api/uploadController.test.js

**Komponente/Bereich:** Upload-Controller für generische Dateien (z.B. Medien, Assets).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass Datei-Uploads akzeptiert, korrekt gespeichert und referenziert werden.
- Prüft, dass Fehler wie zu große Dateien oder ungültige Formate sinnvoll beantwortet werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/backend/getSkeetSendHistory.test.js

**Komponente/Bereich:** Service-Funktion `skeetService.getSkeetSendHistory`.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Die Funktion MUSS für nicht existierende Skeets einen 404-Fehler mit Statusfeld liefern.
- Nur Logs des angefragten Skeets DÜRFEN zurückgegeben werden, absteigend nach `postedAt`.
- Optionale Parameter `limit` und `offset` MÜSSEN zur Paginierung unterstützt werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/backend/postSendLogs.test.js

**Komponente/Bereich:** Auswertung der Post-Send-Logs (Aggregation von Versandversuchen).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Log-Daten MÜSSEN korrekt je Skeet/Thread aggregiert werden.
- Erfolgs- und Fehlversuche pro Plattform MÜSSEN auswertbar sein.

**Konzept-Abgleich:** offen

---

## backend/__tests__/db/migrationsSmoke.test.js

**Komponente/Bereich:** Datenbank-Migrations-Suite (Sequelize CLI).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Alle Migrationen MÜSSEN in der Testumgebung ohne Fehler ausführbar sein.
- Seed-Kommandos MÜSSEN lauffähig sein (Smoke-Test), ohne inhaltliche Garantien.

**Konzept-Abgleich:** offen

---

## backend/__tests__/scheduler/applySchedulerTask.test.js

**Komponente/Bereich:** Scheduler-Setup (`applySchedulerTask`) inklusive Cron-Verkabelung.

**Anforderungen (Architektur/Fachkonzept):**
- Wenn kein gültiger Cron-Ausdruck vorhanden ist, SOLL ein Fallback-Intervall von 1 Minute verwendet werden. (mk)

**Anforderungen (aus Implementierung):**
- `applySchedulerTask` MUSS gespeicherte Scheduler-Settings (`scheduleTime`, `timeZone`) lesen und einen Cron-Task registrieren.
- Nur gültige Cron-Ausdrücke DÜRFEN akzeptiert werden; bei ungültigen Ausdrücken MUSS ein Fehler geworfen werden.
- Beim Cron-Tick MÜSSEN `processDueSkeets` und `processDueThreads` ausgeführt werden.
- Der Engagement-Refresh (`refreshPublishedThreadsBatch`) DARF nur laufen, wenn `DISCARD_MODE` deaktiviert ist und aktive Clients vorhanden sind (basierend auf `presenceService.getLastSeen` und Idle-Threshold).

**Konzept-Abgleich:** abweichend

---

## backend/__tests__/scheduler/schedulerHelpers.test.js

**Komponente/Bereich:** Hilfsfunktionen für wiederkehrende Skeets (Scheduler-Logik).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- `addDaysKeepingTime` MUSS Tage im UTC-Kontext hinzufügen, ohne die Uhrzeit zu verschieben.
- `computeNextWeekly` MUSS den nächsten Termin für einen gewünschten Wochentag berechnen und bei Gleichheit zur nächsten Woche weiterrollen.
- `computeNextMonthly` MUSS bei ungültigen Tageszahlen in den nächsten Monat wechseln und auf den letzten vorhandenen Tag klemmen (z.B. 31. → 28./29.).
- `calculateNextScheduledAt` MUSS für `repeat=daily|weekly|monthly` den nächsten Ausführungstermin auf Basis von `scheduledAt` berechnen.
- `getNextScheduledAt` MUSS für tägliche, wöchentliche und monatliche Wiederholungen den ersten zukünftigen Termin nach einem gegebenen Referenz-Zeitpunkt liefern und bei unbekannten `repeat`-Werten `null` zurückgeben.

**Konzept-Abgleich:** offen

---

## backend/__tests__/scheduler/startupPendingScan.test.js

**Komponente/Bereich:** `markMissedSkeetsPending` – Startup-Scan für überfällige Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Beim Scheduler-Start MÜSSEN Skeets mit `status='scheduled'`, `isThreadPost=false` und `scheduledAt` deutlich vor „jetzt“ (außerhalb des Grace-Window) in den Status `pending_manual` verschoben werden und `pendingReason='missed_while_offline'` erhalten.
- Skeets innerhalb des Grace-Window DÜRFEN ihren Status und `pendingReason` nicht ändern.
- Wiederkehrende Skeets (repeat≠'none') MÜSSEN ebenfalls in `pending_manual` überführt werden, wenn sie deutlich überfällig sind.
- Skeets, die bereits `pending_manual` sind, DÜRFEN durch den Scan nicht verändert werden (Status/Reason bleiben erhalten).
- Soft-gelöschte Skeets DÜRFEN durch den Scan nicht verändert werden; ihr Status MUSS unverändert bleiben.

**Konzept-Abgleich:** offen

---

## backend/__tests__/services/dateParsing.test.js

**Komponente/Bereich:** Datums-Parsing im Skeet-Service.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass eingegebene Datumswerte (Strings/Date) robust validiert und in `Date`-Instanzen umgewandelt werden.
- Stellt sicher, dass ungültige Datumsangaben mit klaren Fehlermeldungen zurückgewiesen werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/services/engagementFilters.test.js

**Komponente/Bereich:** Filter- und Auswahl-Logik für Engagement-Daten.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass nur relevante Engagement-Einträge (z.B. Likes/Reposts) für Auswertungen berücksichtigt werden.
- Prüft die Funktionalität verschiedener Filterkombinationen (Zeiträume, Plattformen, Status).

**Konzept-Abgleich:** offen

---

## backend/__tests__/services/pendingSkeets.test.js

**Komponente/Bereich:** Service für das Laden und Aktualisieren ausstehender Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, wie geplante Skeets in „pending“ überführt bzw. dort aktualisiert werden.
- Stellt sicher, dass Statusübergänge und `scheduledAt`-Updates konsistent sind.

**Konzept-Abgleich:** offen

---

## backend/__tests__/services/platformContext.test.js

**Komponente/Bereich:** Aufbau der Plattform-Kontextdaten (z.B. API-Umgebungen für Bluesky/Mastodon).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Sicherstellt, dass nötige Umgebungsvariablen korrekt gelesen und für Plattformen aufbereitet werden.
- Prüft, dass fehlende oder fehlerhafte Konfigurationen zu klaren Fehlermeldungen führen.

**Konzept-Abgleich:** offen

---

## backend/__tests__/services/profiles.test.js

**Komponente/Bereich:** Profile-Service (z.B. Laden und Aktualisieren von Profilinformationen).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert das Anlegen/Aktualisieren lokaler Profil-Datensätze anhand externer Daten.
- Prüft, dass Konsistenz (Handles, DIDs, Avatare etc.) gewahrt bleibt.

**Konzept-Abgleich:** offen

---

## backend/__tests__/utils/configDefaults.test.js

**Komponente/Bereich:** Konfigurations-Defaults (`configDefaults`).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Stellt sicher, dass Default-Werte für Konfigurationsparameter korrekt gesetzt werden.
- Prüft, dass ENV-Variablen Defaults überschreiben können und falsch gesetzte Werte abgefedert werden.

**Konzept-Abgleich:** offen

---

## backend/__tests__/utils/env.test.js

**Komponente/Bereich:** `env`-Wrapper (`backend/src/env.js`).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert die Aggregation von Umgebungsvariablen in das `env`-Objekt.
- Prüft, dass Defaultwerte und Normalisierung (z.B. Logging-Konfig, Time-Zone) wie erwartet funktionieren.

**Konzept-Abgleich:** offen

---

## backend/__tests__/utils/graphemes.test.js

**Komponente/Bereich:** Utility zur Zeichen- und Graphem-Segmentierung.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Stellt sicher, dass Strings in sichtbare „Zeichen“ (Grapheme) korrekt zerlegt werden (wichtig für Limits).
- Prüft Sonderfälle mit Emojis, kombinierten Zeichen und Umlauten.

**Konzept-Abgleich:** offen

---

## backend/__tests__/utils/logging.test.js

**Komponente/Bereich:** Logging-Helfer (`@utils/logging`). 

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass `LOG_LEVEL` und `LOG_TARGET` korrekt interpretiert werden und Fallbacks funktionieren.
- Verifiziert, dass beim Schreiben in eine unzugängliche Log-Datei automatisch auf die Konsole zurückgefallen wird.
- Testet Log-Rotation nach `LOG_MAX_BYTES` inkl. Anzahl der Backups.
- Stellt sicher, dass Debug-Logs mit `ENGAGEMENT_DEBUG=true` auch bei `LOG_LEVEL=info` zugelassen werden.
- Prüft, dass `isEngagementDebug()` das Zusammenspiel von Level und Flag korrekt widerspiegelt.

**Konzept-Abgleich:** offen

---

## backend/__tests__/utils/switchEnv.test.js

**Komponente/Bereich:** CLI-Skript `scripts/switch-env.js` zum Umschalten von `.env`-Dateien.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass `.env` korrekt aus den environment-spezifischen Dateien (`.env.dev` etc.) kopiert wird.
- Prüft, dass Backups vorhandener `.env`-Dateien angelegt werden.
- Stellt sicher, dass ungültige Modi und fehlende Quell-Dateien zu sinnvollen Exit-Codes führen.

**Konzept-Abgleich:** offen

---

## backend/__tests__/utils/test-config.test.js

**Komponente/Bereich:** Meta-/Konfigurations-Tests für `scripts/test-all.mjs`.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass das Test-All-Skript alle relevanten Workspaces (Root, Dashboard, bsky-client, Shared-UI) referenziert.
- Dient als Sicherheitsnetz, damit zukünftige Änderungen an `scripts/test-all.mjs` die CI-Testgruppen nicht versehentlich reduzieren.

**Konzept-Abgleich:** offen
