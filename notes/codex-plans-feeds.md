1. Datum (TT.MM.JJJJ)
26.12.2025

2. Status (aktueller Stand, keine ToDos)
- MVP-Start festgelegt: Pinned/Saved Feeds, Feed-Manager und Timeline-Tabs mit full-parity-fähigen Schnittstellen.
- Vereinbart: Home-Tabs sollen ausschließlich aus den tatsächlich gepinnten Feeds/Listen (inkl. Standardlisten) abgeleitet werden, um Duplikate zu vermeiden und bsky.app zu matchen.
- Notiert: Tabs/Scroller im Home dürfen sich nicht überlagern; bei Feed-Auswahl über „Feeds“ soll der entsprechende Tab markiert und in den sichtbaren Bereich gescrollt werden.

3. Startpunkt (kurze Einleitung für die nächste Session)
Ziel ist eine vollständige Feed-Integration wie in bsky.app (Feed-Typen, Management, UI und Service-Layer). Als nächstes wird der Ist-Zustand geprüft und der genaue Scope festgelegt.

Service-Layer-Plan (MVP)
- Datenquelle: `fetchFeeds`, `pinFeed`, `unpinFeed`, `reorderPinnedFeeds` via `bsky-client/src/modules/shared/api/bsky.js`.
- Feed-Metadata: `loadFeedMetadata` mit Global-Cache (TTL), Fehler-Caching bei invalid/not-found.
- Timeline-Fetch: `fetchTimeline` mit `feedUri` (Prioritaet vor `tab`), Cursor/Pagination ueber ListService.
- Polling: bestehende List-Polling-Strategie, nur `hasNew` setzen, kein Auto-Reload.
- Error-Handling: `feedPicker.error` fuer harte Fehler, `feedPicker.errors` fuer einzelne Feeds.

UI-Flow-Plan (MVP)
- Timeline-Header: Feed-Button oeffnet Dropdown mit gepinnten Feeds (Auswahl + Schliessen).
- Feed-Manager: Modal/Drawer listet Pinned + Saved; Aktionen Pin/Unpin/Reorder mit Ladezustand.
- Navigation: Seitenleistenpunkt "Feeds" oeffnet Feed-Manager (groesse Layoutvariante).
- Timeline-Tabs: Official Tabs + Pinned Feeds, Badges fuer neue Inhalte, `feedUri` an ListService.

Tests/Doku-Plan (MVP)
- Tests: `useFeedPicker` (pin/unpin/reorder), `feedReducer` state-patches, Timeline listService mit `feedUri`.
- UI-Tests: Feed-Manager render (Pinned/Saved/Errors), Dropdown-Selection im Header.
- Doku: Update in `docs/research/bluesky-client-gap-analysis.md` und ggf. `docs/ui.md`.

4. Nächste Schritte (konkrete, umsetzbare ToDos)
1) MVP-Scope präzisieren: Pinned/Saved Feeds, Feed-Manager und Timeline-Tabs, inkl. parity-fähiger Datenmodelle.
2) Service-Layer planen: API-Wrapper, State/SWR-Handling, Cursor/Pagination, Polling-Strategie.
3) UI-Flows planen: Feed-Auswahl, Management-Screens, Navigation/Deep-Links, Konsistenz mit shared-ui.
4) Tests/Doku planen: Testfälle, Dokumentationsupdates, Abgleich mit bsky.app Verhalten.
5) Home-Tabs-Quelle auf gepinnte Feeds/Listen (inkl. Standardlisten) umstellen und Duplikate eliminieren.
6) Tab-Leiste: Scroll-Buttons/Scroll-Container so anpassen, dass keine Überlagerung entsteht; bei Feed-Auswahl aus dem Menü den Tab markieren und in den sichtbaren Bereich scrollen.

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) MVP-Scope für Pinned/Saved/Manager/Tabs finalisieren und Datenmodelle parity-fähig halten.
2) Technisches Design für API/State/Cache finalisieren.
3) UI/UX-Flows mit Navigation und Deep-Links festlegen.
4) Test- und Doku-Plan finalisieren.
5) Tabs auf Home nur aus gepinnten Feeds/Listen ableiten; Standardlisten berücksichtigen und Dedupe sicherstellen.
6) Tab-Leiste: Überlagerungen vermeiden und aktiven Feed-Tab nach Auswahl aus dem Menü sichtbar machen (Scroll-Into-View + Markierung).

6. Abschluss-Check (prüfbare Kriterien, optional)
- Feed-Typen und Management-Funktionen sind eindeutig beschrieben (parity checklist).
- Service-Layer-Plan enthält konkrete API-Endpunkte, Cache-Strategie, Error-Handling und Polling-Regeln.
- Feed-Picker-Responses sind konsistent (pinned/saved/errors/action + Meta-Felder).
- UI-Navigation und Zustände (loading/empty/error) sind festgelegt.
- Testplan deckt Kernflüsse ab.

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Welche Full-Parity-Features folgen nach dem MVP (z. B. Feed-Search, Create/Subscribe, Feedeinstellungen)?
- Gibt es Einschränkungen bei bsky.app Features, die wir bewusst nicht übernehmen wollen?
