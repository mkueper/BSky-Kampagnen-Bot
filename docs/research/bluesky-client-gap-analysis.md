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
| Soft-Loading/Skeletons | Erfuellt | Beim initialen Laden werden Skelettkarten gerendert (bsky-client/src/modules/timeline/Timeline.jsx). |
| "Neue Beitraege verfuegbar"-Banner | Teilweise | Polling setzt `hasNew` pro Liste (`LIST_MARK_HAS_NEW` via `useListPolling`), und der Header zeigt dazu einen Badge-Punkt pro Tab; ein Banner/CTA in der Timeline gibt es derzeit nicht (bsky-client/src/hooks/useListPolling.js, bsky-client/src/modules/layout/HeaderContent.jsx). |
| Thread-Vorschau / Inline-Zitate | Teilweise | Inline-Zitate werden in `SkeetItem` rendert (bsky-client/src/modules/timeline/SkeetItem.jsx:120-220). Eine Thread-Vorschau innerhalb der Timeline fehlt; stattdessen oeffnet ein Klick die Thread-Ansicht. |
| Kontextleisten ("hat repostet", "gefaellt X") | Fehlt | `SkeetItem` zeigt nur Autor, Handle und Inhalt; es gibt keinen Hinweis auf Repost-/Like-Kontexte (bsky-client/src/modules/timeline/SkeetItem.jsx:200-240). |
| Thread-Ansicht im Fokus | Erfuellt | `ThreadView` baut Parent/Child-Baeume und hebt den fokussierten Beitrag hervor (bsky-client/src/modules/timeline/ThreadView.jsx:1-120). |

## Engagement

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Like, Repost/Quote, Reply | Erfuellt | Buttons fuer Antworten, Likes und Reposts (inkl. Quote-Option) sind vorhanden; State-Management ueber `useBskyEngagement` aktualisiert Counts sofort (bsky-client/src/modules/timeline/SkeetItem.jsx:400-432, bsky-client/src/modules/shared/hooks/useBskyEngagement.js:1-120). |
| Share-Menue (Copy Link, Open in App) | Teilweise | Share-Menue ist vorhanden (Copy-Link umgesetzt); weitere Ziele wie DM/Embed sind aktuell Platzhalter (bsky-client/src/modules/timeline/SkeetItem.jsx). |
| Inline-Medien mit ALT + Lightbox | Teilweise | Bilder werden als Grid/Single gerendert und in einer Lightbox geoeffnet; Videos werden inline und in der Lightbox unterstuetzt. ALT-Text wird angezeigt; Hinweise auf fehlenden ALT-Text sind derzeit nicht Teil der UI (bsky-client/src/modules/timeline/SkeetItem.jsx, bsky-client/src/modules/shared/MediaLightbox.jsx). |

## Composer-Integration

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Modal-Composer inkl. Reply/Quote | Erfuellt | `Modals` oeffnet den `Composer` fuer neue Posts, Replies und Quotes (bsky-client/src/modules/layout/Modals.jsx:9-46, bsky-client/src/modules/composer/Composer.jsx:191-244). |
| Medien-Uploads + GIF/Emoji + Link-Preview | Teilweise | Bis zu vier Bilder, Tenor-GIFs (falls konfiguriert) und Emoji-Picker vorhanden; Link-Preview wird nur geladen, wenn ein Preview-Fetcher konfiguriert ist (`VITE_PREVIEW_PROXY_URL` oder `window.__BSKY_PREVIEW_*`), sonst erscheint eine Standalone-Meldung (bsky-client/src/modules/composer/linkPreviewService.js, bsky-client/src/modules/composer/Composer.jsx). |
| Quick-Composer inline | Fehlt | Es existiert nur der Modal-Composer (Floating Action Button / Nav-Button); keine Inline-Eingabe oberhalb der Timeline. |
| Polls / ALT-Text-Editor | Teilweise | Polls fehlen; ALT-Text ist fuer hochgeladene Medien vorhanden (Alt-Dialog, optional als Pflicht ueber Config). Interaktionseinstellungen werden per Modal geladen/konfiguriert (bsky-client/src/modules/composer/Composer.jsx). |

## Moderation & Filter

| Funktion | Status | Hinweise |
| --- | --- | --- |
| Label-/Safety-Indikatoren | Teilweise | `SkeetItem` wendet Moderations-Entscheidungen an (Warnhinweise/Blur/Toggle fuer offizielle Labels), aber nicht jede bsky.app-Moderationsfunktion ist abgebildet (bsky-client/src/modules/timeline/SkeetItem.jsx). |
| Reply/Quote/Language-Filter (Hide Replies) | Teilweise | Sprachfilter ist im Timeline-Header vorhanden; Hide-Replies/weitere Filter fehlen derzeit (bsky-client/src/modules/layout/HeaderContent.jsx, bsky-client/src/modules/timeline/Timeline.jsx). |

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

**Ziel:** Das bestehende `hasNew`-Signal (pro Liste) sichtbar machen und Nutzer:innen per CTA zum Reload scrollen lassen, sobald neue Posts auf dem Server eingetroffen sind.

### Status-Quellen

- `useListPolling` prueft pro Timeline-Liste den Server-Top-Post (`fetchServerTopId`, `limit=1`). Bei Abweichungen -> `LIST_MARK_HAS_NEW` fuer den betroffenen List-Key.
- Der Header rendert pro Tab einen Badge-Punkt, wenn `tab.hasNew === true` ist (`TimelineHeader`).

### Frontend-Anpassungen

- `TimelineContext`/Listen-State: `hasNew` ist bereits am List-Slice vorhanden; fuer ein Banner braucht es eine klare Zuordnung (z.B. nur fuer den aktiven `listKey` anzeigen).
- `ClientApp` bzw. die aktive Timeline-Section:
  - Bei Klick auf den Banner: Scroll-to-top + `runListRefresh({ list, dispatch })`.
  - Danach `hasNew` fuer den aktiven Tab zuruecksetzen (z.B. ueber einen dedizierten Action-Reset oder im Zuge eines Refreshes).
- UI-Komponente:
  - `NewPostsBanner`: Stickied Element direkt unter dem Header (innerhalb von `homeContent`, aber ausserhalb des Thread-Containers). Darstellung: pillfoermige Schaltflaeche mit Copy wie "Neue Beitraege anzeigen (3)" - Count optional falls API spaeter differenziert.
  - Accessibility: `role='status'` + `aria-live='polite'`, Tastaturfokus moeglich.
- Timeline-Integration:
  - Falls Banner aktiv ist und Timeline gerade laedt, CTA deaktivieren, Spinner/Loading-Text anzeigen.

### Tests & Telemetrie

- Unit-Test fuer `TimelineHeader` oder `NewPostsBanner` sicherstellen, dass Banner nur angezeigt wird, wenn `hasNew` fuer den aktiven Tab true ist.
- Cypress/Playwright-E2E (falls vorhanden) kann spaeter das Verhalten pruefen (Simulieren durch Mocken von `fetchTimeline` Rueckgaben).

### Offene Fragen

- Count neuer Posts: Aktuell koennen wir nur "es existiert etwas Neues" erkennen. Wenn API-seitig mehr Kontext benoetigt wird, koennte `SET_TIMELINE_HAS_NEW` ein Payload `{ count }` bekommen.
- Scroll-Verhalten im Thread-Modus: Banner sollte ausgeblendet sein, solange `threadState.active` true ist, damit das UI nicht ueberlagert.
