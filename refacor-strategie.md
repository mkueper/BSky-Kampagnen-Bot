# Refactor-Strategie für BSky-Kampagnen-Bot

## Überblick

- Fokus auf Engpässe in Scheduler, Engagement-Collector sowie Bsky-Client/Dashboard, weil hier aktuell die meiste Komplexität und Laufzeit anfällt.
- Maßnahmen priorisiert nach Impact auf Stabilität (Scheduler/Engagement), Security (Auth/Storage) und Wartbarkeit (Formulare, State-Management, Electron-Bundle).
- Alle Vorschläge zielen auf inkrementelle Verbesserungen – keine Big-Bang-Refactors.

## Backend & Scheduler

### Versand- und Scheduler-Pipeline
- **PostSendLog ohne atomare Zähler (`backend/src/core/services/scheduler.js:76-104`)**  
  Jeder Versand ruft `PostSendLog.count` auf und schreibt anschließend `attempt: count + 1`. Unter Last führen parallele Jobs zu rennenden `attempt`-Werten und zu zwei Queries pro Plattformversuch. Vorschlag: `attempt` direkt per `sequelize.literal('COALESCE(MAX("attempt"),0)+1')` oder separater Sequenz ermitteln und via `PostSendLog.create` in einer Transaktion schreiben; gleichzeitig Structured Logging (Job-ID, Plattform, Dauer) ergänzen.
- **Serielle Verarbeitung fälliger Threads/Skeets (`backend/src/core/services/scheduler.js:910-1014`)**  
  `processDueThreads` iteriert synchron durch das Limit (MAX_BATCH_SIZE 10) und wartet jeweils auf `dispatchThread`. Bei vielen Jobs stauen sich Cron-Läufe und Engagement-Refreshes. Besser: Jobs in eine interne Queue (p-limit) packen, paralleles Posting pro Plattform erlauben und Laufzeiten per Metric messen.
- **Cron-Task ohne Health-/Lag-Monitor**  
  `applySchedulerTask` kennt zwar `lastEngagementRunAt`, aber es gibt keine Metriken oder Alerts, wenn Cron hinterherhinkt. Ergänze einfache Lag-Berechnung (`now - oldest scheduledAt`) + Prometheus-/StatsD-Export.
- **Konfigurierbare Scheduler-Limits fehlen in `.env.sample`/Docs**  
  Selbst nach Einführung von `SCHEDULER_CONCURRENCY` und `SCHEDULER_LAG_WARN_THRESHOLD_MS` tauchen die Variablen noch nirgends auf. Dokumentiere Defaults + Einsatz (z. B. in `.env.sample`, README, docs/installation/*), damit Ops-Teams sie real nutzen können.
- **Lag-Logging noch ohne Alerting/Metric**  
  Der neue Warn-Log hilft lokal, doch ohne Metriken/Counter lassen sich Peaks nicht dauerhaft verfolgen. Ergänze Counter/Histogram (`scheduler_lag_ms`, `scheduler_queue_depth`) und koppeln sie an bestehende Observability (Prometheus/OpenTelemetry), um Alerts zu definieren.
- **Concurrency aktuell nur Chunk-basiert**  
  `runWithConcurrency` startet `Promise.allSettled` pro Chunk – lange Jobs blockieren immer noch den gesamten Chunk. Besser: echtes Work-Pool-Modell mit `p-limit`/Semaphore (jedes Item startet, sobald ein Slot frei wird), sodass Marathon-Posts nicht andere Slots blockieren.
- **Retry-Backoff weiterhin starr (`RETRY_DELAY_MS`)**  
  Fehlgeschlagene Skeets bekommen fix 60s Delay, unabhängig von Fehlerursachen oder Anzahl Versuche. Einführung eines adaptiven Backoffs (z. B. `retryDelayMs = min(base * 2^attempt, max)`) reduziert API-Druck bei Störungen und lässt sich via Config übersteuern.
- **Scheduler-Run logging unvollständig**  
  Aktuell landet nur `log.error("Scheduler-Lauf ... fehlgeschlagen")`. Ergänze Start/End-Logs mit Anzahl verarbeiteter Jobs, Erfolgsquote und Dauer; dadurch lassen sich Bottlenecks gezielt analysieren.

### Presence & SSE
- **PresenceService ist pro Prozess, nicht clusterfähig (`backend/src/core/services/presenceService.js:1-17`)**  
  Mehrere Backend-Instanzen teilen sich kein Shared State, `presence.getLastSeen()` liefert nur die lokale Instanz. Für skalierte Deployments Presence-Signale über Redis/pubsub oder DB hinterlegen und beim Scheduler aggregieren.
- **SSE-Eventbus ohne Flow-Control (`backend/src/core/services/events.js:10-55`)**  
  Alle Events werden synchron an jedes `res.write` gesendet; bei langsamen Clients kann der Eventloop blockieren, außerdem gibt es keinen Timeout, kein `retry` und keine Backpressure. `stream.pipeline` mit Zeitlimit oder dedizierte SSE-Library einsetzen, Buffer-Größe begrenzen und pro Client Heartbeat/Timeout tracken.
- **Index-Fallback liest bei jedem Request von Disk (`backend/server.js:124-142`)**  
  Jeder nicht-API-Request ruft `fs.access` auf `dashboard/dist/index.html` auf. Cache das Ergebnis beim Start und serve Fehler sofort; verhindert kostspieligen I/O bei hoher Nutzerzahl.

## Engagement-Collector

- **Sequentielle Netzwerk-/DB-Zugriffe pro Segment (`backend/src/core/services/threadEngagementService.js:137-258`)**  
  Likes/Reposts und Replies werden für jedes Segment nacheinander abgeholt, Replies zusätzlich in einer `sequelize.transaction` pro Segment gelöscht/neu angelegt. Ergebnis: Threads mit vielen Segmenten blockieren Minuten. Lösung: pro Plattform `Promise.allSettled` mit kleinem Concurrency-Limit, Replies pro Plattform in einer einzigen Transaktion (`destroy` aller Segment-IDs, dann `bulkCreate` gesammelter Rows) durchführen und `bskyGetPostThread` Ergebnisse in einem Cache (URI → Thread) teilen.
- **Refresh-Batch arbeitet immer auf den zuletzt geänderten Threads (`backend/src/core/services/threadEngagementService.js:292-307`)**  
  `Thread.findAll({ order: [["updatedAt","DESC"]] })` verarbeitet bei jedem Tick dieselben Threads. Stattdessen `WHERE metadata->platformResults->...->metricsUpdatedAt < NOW()-interval` und ein dediziertes Cursor-Feld (`lastEngagementCheckedAt`) nutzen; im Idealfall in eine Job-Tabelle auslagern.
- **Fehlende Guards für Mastodon deaktiviert**  
  Wenn Mastodon-Creds fehlen, springt `refreshThreadEngagement` zwar über Plattform `mastodon`, aber `platformResults` bleibt im falschen Status. Setze `status: "skipped"` mit Begründung, damit das Frontend nicht auf Daten wartet.

## API & Sicherheit

- **Login-Endpunkt ohne Throttling (`backend/src/api/controllers/authController.js:32-62`)**  
  Jeder Loginversuch trifft direkt die Passwort-Validierung. Für öffentlich erreichbare Instanzen Rate-Limiter (IP + Username), progressive Delays und Audit-Log hinzufügen.
- **Logging blockiert Eventloop (`backend/src/utils/logging.js:74-117`)**  
  `fs.appendFileSync` + Rotation in `writeLine` blockiert pro Log-Eintrag. Bei erhöhtem Logging (ENGAGEMENT_DEBUG) kann das Scheduler-Laufzeiten erhöhen. Empfehlung: asynchrones Logging (`pino`, `winston`), Rotation durch `stream.PassThrough`.

## Dashboard-Frontend

- **Monolithische Container-Komponenten**  
  `dashboard/src/App.jsx:1` (1.168 Zeilen), `dashboard/src/components/SkeetForm.jsx:1` (1.555 Zeilen) und `dashboard/src/components/ThreadForm.jsx:1` (1.815 Zeilen) bündeln State-Management, API-Aufrufe und UI. Das verhindert Wiederverwendung (z. B. ThreadComposer für bsky-client) und macht Tests schwer. Vorschlag: Form-spezifische State-Machines + Hooks nach `packages/shared-logic` ziehen (z. B. `useSchedulerFormState`, `useThreadComposer`), UI in kleinere Presentational Components teilen und nur noch Intent-Events nach oben geben.
- **SSE-Client ohne Reconnect-Strategie (`dashboard/src/hooks/useSse.js:9-47`)**  
  Bei Fehlern wird `setConnected(false)` gesetzt, aber es gibt kein Backoff, kein `src.close()/new EventSource`. Dadurch bleiben Dead-Connections hängen, bis die Seite neu geladen wird. Implementiere `EventSource`-Wrapper mit `readyState`-Watcher und `setTimeout`-basiertem Reconnect, inkl. Auth-Refresh (falls `401`).
- **Fetch-Layer fehlt**  
  Über 30 Stellen rufen `fetch('/api/...')` direkt (siehe `rg "/api" dashboard/src`). Eine zentrale API-Schicht (z. B. `@/services/apiClient`) mit generischer Fehlerbehandlung, Retry und `AbortController` würde Doppelcode (Headers, JSON-Parsing) reduzieren und Testbarkeit erhöhen.

## Bluesky-Client

- **AuthContext speichert Tokens unverschlüsselt im LocalStorage (`bsky-client/src/modules/auth/AuthContext.jsx:206-353`)**  
  Trotz `rememberSession` landen komplette Sessions (`accessJwt`, `refreshJwt`, `did`) als JSON in `localStorage`. Browser-Extensions oder abhanden gekommene Backups können die Tokens missbrauchen. Empfehlung: Sessions nur im Memory halten, optional verschlüsselt über OS-Keychain (Electron) oder WebCrypto + passwortgeschützter Store persistieren. Mindestens `localStorage`-Zugriffe try/catch-absichern, weil Safari Private Mode/SSO das Schreiben verbietet.
- **AuthContext ist 600+ Zeilen komplexer State (`bsky-client/src/modules/auth/AuthContext.jsx:1-646`)**  
  Er vereint Storage-Protokoll, Multi-Account-Reducer, Netzwerk-Funktionen und UI Events (`addAccount`). Aufsplitten in (1) reine Storage-/Account-Service (Plain JS), (2) `useAuthStore` Hook (Zustand/Redux) und (3) UI-spezifische Context-Provider. Dadurch werden Tests möglich (aktueller Code nutzt direkte `localStorage`-Aufrufe in Hooks).
- **ListService ohne Request-Abbrüche (`bsky-client/src/modules/listView/listService.js:98-172`) & Timeline ohne Cancels (`bsky-client/src/modules/timeline/Timeline.jsx:31-75`)**  
  Beim Tab-Wechsel bleiben alte `runListRefresh` Promises aktiv und überschreiben neue Ergebnisse (Race Condition). Addiere `AbortController` pro List-Key und frühzeitige Exit-Bedingungen auf Cursor-Level.
- **VirtualizedList an DOM-ID gebunden (`bsky-client/src/modules/listView/VirtualizedList.jsx:43-121`)**  
  Das Scroll-Tracking geht hard-coded auf `#bsky-scroll-container`. Reusability leidet (Chat, Modal-Listen), außerdem funktioniert Virtualisierung nicht, wenn mehrere Scroller existieren. Refactor zu `forwardRef` + `ResizeObserver`, optional `react-virtualized`/`@tanstack/virtual`.
- **Timeline-Itemhöhe fest (`bsky-client/src/modules/timeline/Timeline.jsx:145-167`)**  
  `itemHeight={220}` ignoriert tatsächliche Content-Höhen und sorgt bei Bildern/Threads für „Sprünge“. Lösung: dynamische Höhenmessung (IntersectionObserver) oder `estimator` an `VirtualizedList`.

## Desktop / Electron

- **Backend läuft im UI-Prozess (`electron/main.js:185-249`)**  
  `startBackend()` `require`t `backend/server.js` direkt – stürzt der Scheduler ab, reißt er die gesamte Electron-App inkl. Renderer mit. Start des Backends in einem Child-Prozess (per `fork`/`spawn`) mit IPC-Heartbeat, Restart-Strategie und eigener Log-Pipe erhöht Stabilität. Gleichzeitig kann der Renderer auf echte HTTP-Errors reagieren, statt durch Prozess-Exit zu crashen.
- **Temp-/Uploads-Verzeichnisse ohne Aufräumplan (`electron/main.js:132-170`)**  
  Cleanup läuft nur auf IPC-Call; es gibt keinen Cron beim App-Start. Beim Exit `cleanupTempDir` aufrufen und optional `setInterval` anstoßen.

## Tooling & DevOps

- **Build-/Test-Runner seriell**  
  `scripts/build-all.js:24-64` und `scripts/test-all.mjs:32-41` führen Workspaces nacheinander aus. Mit wachsender Codebasis dauern Builds/Testläufe unverhältnismäßig lange. CI-Skripte auf `pnpm --filter ... run build --parallel` bzw. `p-map` umstellen und Artefakte cachen (z. B. via Turborepo/Taskfile).
- **Keine Änderungserkennung für Teilprojekte**  
  Alle Builds laufen auch dann, wenn nur Docs geändert wurden. Git-Diff-basierte Filter (z. B. `lint-staged`-ähnliche Matrix) reduzieren Laufzeiten insbesondere für Release-Pipelines.

## Observability & Tests

- **Logging ohne Metriken/Tracing**  
  Neben dem synchronen Logger fehlen strukturierte Events (Prometheus, OpenTelemetry). Scheduler- und Engagement-Latenzen lassen sich ohne Metriken schwer überwachen. Einführung eines kleinen Metrics-Moduls (Histograms für `dispatchThread`/`refreshThreadEngagement`) lohnt sich sofort.
- **Testabdeckung kritischer Kernmodule gering**  
  Für Scheduler (`backend/src/core/services/scheduler.js`) und AuthContext existieren keine dedizierten Tests (`vitest`-Suchlauf listet nur List/Composer/Notifications). Priorität: Unit-Tests für Random-Offset-Berechnung, Pending-Skeet-Logik und Multi-Account-Auth-Flows erstellen, bevor größere Refactors starten.

---

Diese Punkte bieten einen klaren Fahrplan: zuerst Backend/Security härten, danach UI-State isolieren und Tooling beschleunigen. Jede Maßnahme kann isoliert umgesetzt und getestet werden, sodass kein umfassender Rewrite nötig ist.
