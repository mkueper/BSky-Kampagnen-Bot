# Bluesky-Client vs. offizielle Timeline

Gegenueberstellung der in Schritt 1 erfassten offiziellen Timeline-Funktionen mit dem aktuellen Direkt-Client (Stand: Repository-Inhalt). Status-Codes:

- `Erfuellt`: Verhalten entspricht grob der Referenz.
- `Teilweise`: Teilfunktion vorhanden, aber mit Luecken.
- `Fehlt`: Noch nicht implementiert oder nur als Platzhalter vorhanden.

## Feeds & Tabs

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Feste Following/Discover-nahe Tabs | Erfuellt | Es gibt die Tabs `Discover`, `Following`, `Popular with Friends`, `Mutuals`, `Best of Follows`. Re-Klick auf einen aktiven Tab triggert einen Reload (bsky-client/src/modules/layout/HeaderContent.jsx:7-69, bsky-client/src/ClientApp.jsx:73-82). |
| Benutzerdefinierte Feeds (Picker, Pins, Sortierung) | Fehlt | Kein Feed-Picker in der Timeline; der separate Navigationspunkt `feeds` zeigt nur "Feeds folgt" (bsky-client/src/ClientApp.jsx:191-194). |
| Feed-spezifische Optionen (z. B. Hide Reposts pro Feed) | Fehlt | In der Timeline oder im Header gibt es keine Einstellungs-Schaltflaeche; keine State- oder UI-Elemente fuer Filter gefunden. |

## Timeline-UI

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Infinite Scroll + Auto-Laden | Erfuellt | `Timeline` haengt einen Scroll-Listener an den Container und laedt bei 80 % Scrolltiefe nach (bsky-client/src/modules/timeline/Timeline.jsx:5-140). |
| Soft-Loading/Skeletons | Teilweise | Beim Laden erscheint nur ein Spinner, keine Skelettkarten (bsky-client/src/modules/timeline/Timeline.jsx:98-115). |
| "Neue Beitraege verfuegbar"-Banner | Fehlt | `timelineHasNew` wird gesetzt (bsky-client/src/ClientApp.jsx:55-82, bsky-client/src/context/AppContext.jsx:17-48), aber kein Component liest den Wert. |
| Thread-Vorschau / Inline-Zitate | Teilweise | Inline-Zitate werden in `SkeetItem` rendert (bsky-client/src/modules/timeline/SkeetItem.jsx:120-220). Eine Thread-Vorschau innerhalb der Timeline fehlt; stattdessen oeffnet ein Klick die Thread-Ansicht. |
| Kontextleisten ("hat repostet", "gefaellt X") | Fehlt | `SkeetItem` zeigt nur Autor, Handle und Inhalt; es gibt keinen Hinweis auf Repost-/Like-Kontexte (bsky-client/src/modules/timeline/SkeetItem.jsx:200-240). |
| Thread-Ansicht im Fokus | Erfuellt | `ThreadView` baut Parent/Child-Baeume und hebt den fokussierten Beitrag hervor (bsky-client/src/modules/timeline/ThreadView.jsx:1-120). |

## Engagement

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Like, Repost/Quote, Reply | Erfuellt | Buttons fuer Antworten, Likes und Reposts (inkl. Quote-Option) sind vorhanden; State-Management ueber `useBskyEngagement` aktualisiert Counts sofort (bsky-client/src/modules/timeline/SkeetItem.jsx:400-432, bsky-client/src/modules/shared/hooks/useBskyEngagement.js:1-120). |
| Share-Menue (Copy Link, Open in App) | Fehlt | In `SkeetItem` existieren keine weiteren Aktions-Buttons ausser Reply/Repost/Like/Refresh. |
| Inline-Medien mit ALT + Lightbox | Teilweise | Bilder werden als Grid/Single gerendert und ueber eine Lightbox mit Pfeilnavigation geoeffnet (bsky-client/src/modules/timeline/SkeetItem.jsx:205-320, bsky-client/src/modules/shared/MediaLightbox.jsx:1-76). ALT-Text wird angezeigt, aber es gibt keinen Hinweis, wenn einer fehlt bzw. keine Multi-Media-Typen (Video) ausserhalb statischer Bilder. |

## Composer-Integration

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Modal-Composer inkl. Reply/Quote | Erfuellt | `Modals` oeffnet den `Composer` fuer neue Posts, Replies und Quotes (bsky-client/src/modules/layout/Modals.jsx:9-46, bsky-client/src/modules/composer/Composer.jsx:191-244). |
| Medien-Uploads + GIF/Emoji + Link-Preview | Erfuellt | Bis zu vier Bilder, Tenor-GIFs (falls konfiguriert) und Emoji-Picker vorhanden; Link-Vorschauen werden automatisch geladen (bsky-client/src/modules/composer/Composer.jsx:320-424). |
| Quick-Composer inline | Fehlt | Es existiert nur der Modal-Composer (Floating Action Button / Nav-Button); keine Inline-Eingabe oberhalb der Timeline. |
| Polls / ALT-Text-Editor | Fehlt | Im Composer gibt es weder Eingabefelder fuer Umfragen noch fuer ALT-Texte der hochgeladenen Bilder; der Button "Jeder kann interagieren" ist nur ein Platzhalter (bsky-client/src/modules/composer/Composer.jsx:392-401). |

## Moderation & Filter

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Label-/Safety-Indikatoren | Fehlt | Timeline-Beitraege werden ohne Warnhinweise oder Click-to-view-Wrapper dargestellt; `SkeetItem` wertet keine Label-Informationen aus. |
| Reply/Quote/Language-Filter (Hide Replies) | Fehlt | Kein UI-Element fuer Filter; einzig ein (noch unverbundener) Button im Composer fuer Interaktions-Einstellungen (bsky-client/src/modules/composer/Composer.jsx:392-401). |

## Thread-Handling

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Expandable Threads ("Weitere Antworten anzeigen") | Fehlt | Threads werden nur in der separaten `ThreadView` dargestellt; es gibt keine "Show more replies"-Schaltflaechen innerhalb der Timeline-Liste. |
| Inline-Fokus (Deep-Link zu Post mit Parent/Child) | Erfuellt | `useThread` laedt einen Post inklusive Parents/Replies, hebt ihn hervor und erlaubt das Zurueckspringen (bsky-client/src/hooks/useThread.js:1-120, bsky-client/src/modules/timeline/ThreadView.jsx:1-120). |

## Misc UX

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Swipe-Gesten / Keyboard Shortcuts | Teilweise | Auf Mobilgeraeten oeffnet/schliesst eine Edge-Swipe-Geste die Navigation (`BskyClientLayout` Pointer-Handler), aber dedizierte Keyboard-Shortcuts sind nicht vorhanden (bsky-client/src/modules/layout/BskyClientLayout.jsx:34-91). |
| On-Demand Refresh (Pull-to-refresh, Button) | Teilweise | Ein erneuter Tab-Klick loest ein Reload aus, einzelne Posts haben einen "Aktualisieren"-Button; Pull-to-refresh existiert nicht (bsky-client/src/ClientApp.jsx:73-82, bsky-client/src/modules/timeline/SkeetItem.jsx:420-432). |
| Scroll-to-top / Floating Actions | Erfuellt | ScrollTop-Button und Floating Compose Button sind vorhanden (bsky-client/src/modules/layout/BskyClientLayout.jsx:135-158, bsky-client/src/modules/timeline/ScrollTopButton.jsx:1-72). |
| Feed-spezifische Settings ("Hide Reposts" u. a.) | Fehlt | Keine UI fuer feedbezogene Toggles. |

## Offene Baustellen (Prioritaetshinweise)

1. Custom-Feed-Picker inkl. Pins/Sonderoptionen, um die offiziellen Feeds abzudecken.
2. "Neue Beitraege"-Banner + Kontextleisten fuer Reposts/Likes, damit der Timeline-Status ersichtlich ist.
3. Moderations- und Interaktionsfilter (Labels, Hide-Replies, Reply-Permissions) sichtbar machen.
4. Quick Composer (inline) sowie ALT-Text-/Poll-Unterstuetzung im Modal.

## Umsetzungsschritte - Feed-Picker & Pins

**Ziel:** Benutzerdefinierte Feeds der Bluesky-Session direkt im Timeline-Header auswahlen, sortieren und anpinnen. Offizielle Feeds ("Discover", "Mutuals", ...) bleiben als Standardregister erhalten.

### Backend

- `blueskyClient` erweitern:
  - Neue Helper `getPreferences()` und `updatePreferences()` via `agent.app.bsky.actor.getPreferences/putPreferences`, um die vom offiziellen Client genutzten `app.bsky.actor.defs#savedFeedsPref` und `...#savedFeedsSortPref` auszulesen bzw. zu schreiben.
  - Helper `resolveFeedMetadata(feedUri)` der `app.bsky.feed.getFeedGenerator` einliest, um Label, Beschreibung, Thumbnail fuer neue Feeds zu liefern (Caching 2-5 Minuten, um UI-Spinner zu vermeiden).
- API-Routes:
  - `GET /api/bsky/feeds`: liefert `official`, `pinned`, `saved`, `recent` (optional) samt `feedUri`, `displayName`, `description`, `avatar`, `likeCount` (falls verfuegbar). Quelle: Preferences + `resolveFeedMetadata`.
  - `POST /api/bsky/feeds/pin` / `DELETE /api/bsky/feeds/pin`: reihen `feedUri` in den gespeicherten Preference-Block ein bzw. entfernen ihn.
  - `PATCH /api/bsky/feeds/pin-order`: nimmt eine sortierte Liste entgegen und persistiert sie via `updatePreferences`.
  - Fehlerfaelle sauber mappen (z. B. 409 bei fehlenden Credentials, 400 bei unbekannter URI).

### Frontend

- State:
  - `AppContext`: `timelineSource = { kind: 'following' | 'official' | 'feed', id, feedUri }`, `feedPicker = { loading, items, pinnedIds, error }`, `feedManagerOpen`.
  - Neue Actions `SET_TIMELINE_SOURCE`, `SET_FEED_PICKER_DATA`, `SET_FEED_MANAGER_OPEN`.
- Datenabruf:
  - Hook `useFeedPicker` kapselt `GET /api/bsky/feeds`, normalisiert die Segmente und cached sie (z. B. in `sessionStorage`).
  - Beim Start `section === 'home'` => Feeds laden, Tabs generieren.
- UI:
  - `TimelineHeader`: entkoppeln von fixer `TIMELINE_TABS`, stattdessen Props `primaryTabs` (Following + official), `pinnedTabs`, `onOpenFeedManager`. Aktive Pins erscheinen neben den Standardtabs, optional mit Badge fuer Feed-Typ.
  - `FeedManagerDrawer` (Modal oder Offcanvas): listet `pinned` (sortable via Drag-and-drop), `saved` (mit Pin-Buttons) und `discover` (Suchfeld -> re-use `searchBsky` "feeds"-Tab?). Aktionen rufen die neuen API-Endpunkte auf.
  - Navigationspunkt `feeds`: statt Platzhalter denselben Manager (mit grossem Layout) anzeigen, so dass das Feature auch ohne Timeline erreichbar ist.
- Timeline-Aufrufe:
  - `Timeline` erhaelt Props `{ source }`. Wenn `source.kind === 'feed'`, ruft das Frontend `GET /api/bsky/timeline?feedUri=...` auf (Controller erweitert `getTimeline` um `feedUri`-Param; Vorrang vor `tab`).
  - Query-Key in `fetchTimeline` (bsky-client/src/modules/shared/api/bsky.js) um `feedUri` erweitern.

### Persistenz & Edge Cases

- Wenn `getPreferences` keinen `savedFeedsPref` liefert, Standardliste aus OFFICIAL_FEED_GENERATORS liefern und UI schreibgeschuetzt halten.
- Pinned-Feeds ohne gueltiges `feedUri` ignorieren (Backend loggt Warnung, Frontend zeigt Info).
- Tests:
  - API-Controller-Tests fuer neue Routes (Mock von `blueskyClient`).
  - Frontend-Tests fuer `TimelineHeader` (z. B. `@testing-library/react`), damit Tab-Renderings bei dynamischen Daten stabil sind.

## Umsetzungsschritte - "Neue Beitraege"-Banner

**Ziel:** Das bestehende `timelineHasNew`-Signal sichtbar machen und Nutzer:innen per CTA zum Reload scrollen lassen, sobald neue Posts auf dem Server eingetroffen sind.

### Status-Quellen

- `ClientApp` setzt `timelineTopUri` und prueft alle 45 s auf Abweichungen (`fetchTimelineApi` mit `limit=1`). Bei Unterschieden -> `SET_TIMELINE_HAS_NEW true`.
- Der Scroll-Container `bsky-scroll-container` existiert bereits; `ScrollTopButton` nutzt ihn als Referenz.

### Frontend-Anpassungen

- `AppContext`: `timelineHasNew` existiert, aber UI liest ihn nicht. Neue Memo `showTimelineBanner = timelineHasNew && section === 'home' && !threadState.active`.
- `ClientApp`:
  - Nutzen des bereits definierten `scrollTimelineToTop`. Bei Klick auf den Banner: `scrollTimelineToTop()`, `refreshTimeline()`, `dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })`.
  - Zusatz-Effekt: Wenn Timeline wieder bis `< 120px` gescrollt wird (Event-Listener auf `bsky-scroll-container`), `SET_TIMELINE_HAS_NEW false`, damit Banner nicht "steckenbleibt".
- UI-Komponente:
  - `NewPostsBanner`: Stickied Element direkt unter dem Header (innerhalb von `homeContent`, aber ausserhalb des Thread-Containers). Darstellung: pillfoermige Schaltflaeche mit Copy wie "Neue Beitraege anzeigen (3)" - Count optional falls API spaeter differenziert.
  - Accessibility: `role='status'` + `aria-live='polite'`, Tastaturfokus moeglich.
- Timeline-Integration:
  - `Timeline` sendet beim Laden `onTopItemChange` bereits das neue Item nach oben; beim Refresh also `onTopItemChange` -> `SET_TIMELINE_TOP_URI`.
  - Falls der Banner aktiv ist und `Timeline` gerade laedt (`onLoadingChange(true)`), CTA deaktivieren, Spinner anzeigen.

### Tests & Telemetrie

- Unit-Test fuer `TimelineHeader` oder `NewPostsBanner` sicherstellen, dass Banner nur angezeigt wird, wenn `timelineHasNew` true ist.
- Cypress/Playwright-E2E (falls vorhanden) kann spaeter das Verhalten pruefen (Simulieren durch Mocken von `fetchTimeline` Rueckgaben).

### Offene Fragen

- Count neuer Posts: Aktuell koennen wir nur "es existiert etwas Neues" erkennen. Wenn API-seitig mehr Kontext benoetigt wird, koennte `SET_TIMELINE_HAS_NEW` ein Payload `{ count }` bekommen.
- Scroll-Verhalten im Thread-Modus: Banner sollte ausgeblendet sein, solange `threadState.active` true ist, damit das UI nicht ueberlagert.
