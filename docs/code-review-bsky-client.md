# Code Review – `bsky-client`

## Ziel
Kurzes Review der Client-Applikation, um schnelle Hebel für Stabilität, Wartbarkeit und Entwicklerproduktivität zu identifizieren.

## Findings

- **Fehlerobjekt liefert eine Promise statt den Body** (`bsky-client/src/lib/fetcher.js:3`): `defaultFetcher` hängt ein `Error`-Objekt an und setzt `error.info = res.json()` ohne zu awaiten. In Folge steht in `error.info` eine Promise statt des tatsächlichen Antwortkörpers, was Debugging, Workflows wie SWR und zentralisierte Error-Handler stark erschwert.
- **Monolithischer `AppContext`** (`bsky-client/src/context/AppContext.jsx:37`): Ein einziger Context hält alle Timelines, Notifications, Composer-, Thread- und Profile-Zustände plus UI-Flags. Jeder Dispatch führt zu einem neuen State-Objekt – selbst wenn nur ein kleiner Teilsplit betroffen ist – und alle Konsumenten der Contexts werden neu gerendert. Das macht die Komponente schwer zu testen und erschwert selektive Optimierungen (Memoisierung, Selector Hooks).
- **`AuthenticatedClientApp` trägt zu viele Verantwortlichkeiten** (`bsky-client/src/ClientApp.jsx:1`): Routing, Polling, Modals, Composer-Handler, Feed-Menüs, Chat, Profilviewer usw. stecken in einer einzigen 500+ Zeilen-Komponente. Der dadurch entstehende „God Component“-Effekt erschwert die Traceability von Nebenwirkungen, überfüllte Hooks (z. B. Multi-`useEffect` für Listen + Polling) treiben den geistigen Overhead nach oben und erschweren die Einführung von Tests.
- **Fetcher-/API-Logik ins Backend verschoben, aber Client bleibt stark an globalen `HashRouter`-Routes und `useAppState` gekoppelt** (`bsky-client/src/ClientApp.jsx:1`): Die Kapitel `runListRefresh` und `useListPolling` verwenden globale Keys, die schwer zu isolieren sind. Es fehlt derzeit eine klare Trennung zwischen `listService`/`polling` und der UI; das hemmt z. B. das Schreiben von Storybook-Szenarien oder das Nachbauen von ListSwitching ohne AppState.

## Recommendations

1. **Fetcher reparieren** – warte auf `res.json()` bevor du `error.info` füllst und erwäge, ein kleines Response-Parsing-Utility zu kapseln, das HTTP-Status, Standard-Fehlermeldungen und optionale Logs zusammenführt.
2. **AppState in schmalere Provider splitten** – z. B. `TimelineProvider`, `ComposerProvider` und `NotificationsProvider`, die nur jeweils ihren Teil des Reducer-States per Selector exposed. Das senkt Re-Render-Fluten und erlaubt `useMemo`/`useSelector` statt eines kompletten Global-State-Dumps.
3. **UI-Layout entwirren** – zieh das Routing, Strings’ `Suspense`-Fallbacks und Polling-Registrierungen aus `AuthenticatedClientApp` heraus (Service Layer + UI-Layer trennen). Jede Sektion (Timeline, Nachrichten, Einstellungen) sollte mit eigenen Komponenten und Hooks klar gekapselt und bei Bedarf lazy geladen werden.
4. **Liste/Feed-Logik test- und wiederverwendbar machen** – abstrahiere `runListRefresh` & Polling (`modules/listView/listService.js`, `hooks/useListPolling.js`) so, dass die Logik mit `useReducer`/`useCallback` getestet werden kann, ohne den gesamten AppContext zu mocken.
5. **Ergänzende Tests** – beginne mit Unit-Tests für `fetcher` + Polling Hooks; dadurch lässt sich regressionssicherstellen, dass Dispatch-Raten, `useEffect`-Cleanup und `SWRConfig`-Dedupe korrekt bleiben.

## Weiteres Vorgehen
- Validation: Die neuen Provider separat mit `react-test-renderer` oder Vitest testen; der globale AppState mag gleich bleiben, falls die Separation schrittweise erfolgt.
- Dokumentation: Den Review ergänzt um eine kurze Tabelle (z. B. im `docs/`-Bereich), damit zukünftige Reviewer wissen, welche Contexts aktuell noch eng gekoppelt sind.
