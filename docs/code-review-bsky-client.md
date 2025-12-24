# Code Review – `bsky-client`

## Ziel
Kurzes Review der Client-Applikation, um schnelle Hebel für Stabilität, Wartbarkeit und Entwicklerproduktivität zu identifizieren.

## Findings

- **Fehlerobjekt liefert eine Promise statt den Body** (`bsky-client/src/lib/fetcher.js:3`): `defaultFetcher` hängt ein `Error`-Objekt an und setzt `error.info = res.json()` ohne zu awaiten. In Folge steht in `error.info` eine Promise statt des tatsächlichen Antwortkörpers, was Debugging, Workflows wie SWR und zentralisierte Error-Handler stark erschwert.
- **Monolithischer `AppContext`** (`bsky-client/src/context/AppContext.jsx:37`): Ein einziger Context hält alle Timelines, Notifications, Composer-, Thread- und Profile-Zustände plus UI-Flags. Jeder Dispatch führt zu einem neuen State-Objekt – selbst wenn nur ein kleiner Teilsplit betroffen ist – und alle Konsumenten der Contexts werden neu gerendert. Das macht die Komponente schwer zu testen und erschwert selektive Optimierungen (Memoisierung, Selector Hooks).
- **`UIContext` auslagern** (`bsky-client/src/context/UIContext.jsx`): UI Flags (Profile Viewer, Hashtag Search, Chat Viewer, Media Lightbox, Notification-Settings, `quoteReposts`) laufen jetzt über einen dedizierten Kontext, die `guardedDispatch`-Schicht verteilt Actions an Timeline/Composer/Thread/UI und `useUIState` sorgt für selektive Selektoren. Das reduziert den globalen Scope der bisherigen AppContext-Instanz deutlich.
- **`AuthenticatedClientApp` trägt zu viele Verantwortlichkeiten** (`bsky-client/src/ClientApp.jsx:1`): Routing, Polling, Modals, Composer-Handler, Feed-Menüs, Chat, Profilviewer usw. stecken in einer einzigen 500+ Zeilen-Komponente. Der dadurch entstehende „God Component“-Effekt erschwert die Traceability von Nebenwirkungen, überfüllte Hooks (z. B. Multi-`useEffect` für Listen + Polling) treiben den geistigen Overhead nach oben und erschweren die Einführung von Tests.
- **Fetcher-/API-Logik ins Backend verschoben, aber Client bleibt stark an globalen `HashRouter`-Routes und `useAppState` gekoppelt** (`bsky-client/src/ClientApp.jsx:1`): Die Kapitel `runListRefresh` und `useListPolling` verwenden globale Keys, die schwer zu isolieren sind. Es fehlt derzeit eine klare Trennung zwischen `listService`/`polling` und der UI; das hemmt z. B. das Schreiben von Storybook-Szenarien oder das Nachbauen von ListSwitching ohne AppState.

## Recommendations

1. **Fetcher reparieren** – warte auf `res.json()` bevor du `error.info` füllst und erwäge, ein kleines Response-Parsing-Utility zu kapseln, das HTTP-Status, Standard-Fehlermeldungen und optionale Logs zusammenführt.
2. **AppState in schmalere Provider splitten** – z. B. `TimelineProvider`, `ComposerProvider`, `ThreadProvider` und den neuen `UIProvider`, die nur jeweils ihren Teil des Reducer-States per Selector exposed. Das senkt Re-Render-Fluten und erlaubt `useMemo`/`useSelector` statt eines kompletten Global-State-Dumps.
3. **UI-Layout entwirren** – zieh das Routing, Strings’ `Suspense`-Fallbacks und Polling-Registrierungen aus `AuthenticatedClientApp` heraus (Service Layer + UI-Layer trennen). Jede Sektion (Timeline, Nachrichten, Einstellungen) sollte mit eigenen Komponenten und Hooks klar gekapselt und bei Bedarf lazy geladen werden.
4. **Liste/Feed-Logik test- und wiederverwendbar machen** – abstrahiere `runListRefresh` & Polling (`modules/listView/listService.js`, `hooks/useListPolling.js`) so, dass die Logik mit `useReducer`/`useCallback` getestet werden kann, ohne den gesamten AppContext zu mocken.
5. **Ergänzende Tests** – beginne mit Unit-Tests für `fetcher` + Polling Hooks; dadurch lässt sich regressionssicherstellen, dass Dispatch-Raten, `useEffect`-Cleanup und `SWRConfig`-Dedupe korrekt bleiben.

## Umsetzung – aktueller Stand

- `defaultFetcher` wartet jetzt auf das Ergebnis von `res.json()` bevor es Exceptions mit `error.info` füllt, exportiert sich für Tests und kann von `fetcher` weiterhin über den Timeline-Shortcut genutzt werden. Die neue Datei `bsky-client/__tests__/lib/fetcher.test.js` dokumentiert Success-, Error- und Timeline-Abzweigungen.
- `runListRefresh`, `runListLoadMore` und `fetchServerTopId` setzen auf `modules/listView/listStateHelpers.js` und sind durch `bsky-client/__tests__/modules/listView/listService.test.js` gegen Timeline-, Notifications- und Top-ID-Szenarien abgesichert. Dadurch lässt sich die Liste- und Feed-Logik sicher testen und vom UI-Context entkoppeln.
- `AuthenticatedClientApp` gibt `useChatPolling` jetzt explizit ein Guard-Flag `shouldRunChatPolling` mit, das nur dann `fetchChatUnreadSnapshot`/`fetchChatLogs` startet, wenn `useBskyAuth().status === 'authenticated'` (siehe `bsky-client/src/ClientApp.jsx`). So entstehen keine unauthentifizierten 404-Abfragen mehr.

Empfehlung 4 und 5 sind damit größtenteils umgesetzt; der nächste Fokus liegt auf Punkt 2 und 3 der Recommendations (zielgerichtete Provider-Splits und UI-Service-Trennung), um den Rest der Applogik weiter zu entkoppeln.

## Weiteres Vorgehen
- Validation: Die neuen Provider separat mit `react-test-renderer` oder Vitest testen; der globale AppState mag gleich bleiben, falls die Separation schrittweise erfolgt.
- Dokumentation: Den Review ergänzt um eine kurze Tabelle (z. B. im `docs/`-Bereich), damit zukünftige Reviewer wissen, welche Contexts aktuell noch eng gekoppelt sind.

## Empfehlung 2 & 3 – Nächste Schritte

- **Provider-Split präzisieren** – `AppProvider` importiert derzeit alle Sub-Provider (`TimelineProvider`, `ComposerProvider`, `ThreadProvider`, `UIProvider`) und führt im `AppProviderContent` die Zustände/Merges sowie den `guardedDispatch` zusammen (`bsky-client/src/context/AppContext.jsx:10-139`). Ziel ist es, diese Verantwortlichkeiten zu entflechten, indem jede Provider-Instanz ausschließlich den Teilzustand exponiert, den sie kontrolliert, während `AppProviderContent` auf wirklich globale Daten (z. B. `section`) beschränkt bleibt. Damit ließe sich `useAppState` wieder auf einen schlanken Index reduzieren und jede `useXxxState`-Hook kann ohne großen Kontext geladen werden. Tests sollten künftig durch `react-test-renderer` sicherstellen, dass Dispatches mit `guardedDispatch({ type: 'LIST_SET_REFRESHING', … })` nur die Timeline-Kontextreducer treffen und nicht unnötig UI- oder Thread-States rebuilden.
- **UI-Service-Logik auslagern** – `AuthenticatedClientApp` orchestriert Routing, Polling und UI-Flags (`bsky-client/src/ClientApp.jsx:150-260`) und feuert `useListPolling`, `useNotificationPolling` sowie `useChatPolling` direkt aus der Hauptkomponente, was die Trennung von UI- und Service-Layer aufhebt. Schrittweise sollten Polling-/Routing-Registrierungen in dedizierte Komponenten verschoben werden (z. B. ein `TimelineSection`-Component, das selbst `useListPolling` aufruft) und Modals/Thread-Composer nach Context oder `lazy`-Schnittstellen auslagern. Tests könnten hier mit Vitest sicherstellen, dass `AuthenticatedClientApp` nur dann überhaupt Render-Pfade für `TimelineSection` oder `ChatSection` aufbaut, wenn `section` und `authStatus` passen, ohne dass die Polling-Hooks im Headless-Modus feuern.

Ein konkreter Ordnungsbeitrag in der Dokumentation wäre eine Tabelle, die die aktuellen Context-Kopplungen (z. B. welche Aktion welchen Provider betrifft) aufzeigt; sie würde als Leitfaden dienen, wenn wir die noch offenen Recommendations (Provider-Split, UI-Service-Trennung) umsetzen.
