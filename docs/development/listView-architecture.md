# ListView-Architektur im BSky-Kampagnen-Client

**Diese Datei dient als Referenz, wenn später neue Feeds/Listen ergänzt oder das UI vereinheitlicht werden soll.**

---

### Ziel

Die ListView-Architektur vereinheitlicht die Daten- und Lade-Logik für alle Listen im Client:

- Timelines (Discover, Following, Popular with Friends, Mutuals, Best of Followers, …)
- Mitteilungen (Alle, Erwähnungen)
- spätere Profil-Ansichten und weitere Listen

Statt separater Speziallösungen gibt es ein gemeinsames Modell für:

- Laden (Initial-Load)
- Refresh (inkl. Polling / „es gibt Neues“)
- „Load more“ (ältere Einträge)
- Scroll-to-top / Home-Verhalten

---

### State-Modell

Der zentrale State für Listen sitzt im **ListView-Reducer**:

```js
// Grobstruktur
{
  activeListKey: string;
  lists: Record<string, ListViewState>;
}

interface ListViewState {
  key: string;
  kind: "timeline" | "notifications" | "profile" | "custom";
  label: string;
  route?: string | null;

  items: any[];
  topId: string | null;      // ID/URI des obersten Elements
  cursor: string | null;     // Cursor für "ältere Einträge"

  loaded: boolean;           // wurde die Liste schon einmal geladen?
  hasNew: boolean;           // Polling hat neuere Einträge erkannt?
  supportsPolling: boolean;  // soll diese Liste gepollt werden?
  supportsRefresh: boolean;  // darf sie aktiv neu geladen werden?

  isRefreshing: boolean;     // Refresh-Ladevorgang aktiv (Spinner oben)
  isLoadingMore: boolean;    // "Load more" aktiv (Spinner unten)
}
```

Wichtige Listen-Schlüssel (Beispiele):
 - `discover`
 - `following`
 - `notifs:all`
 - `notifs:mentions`
 - weitere Feeds wie „Popular with friends“, „Mutuals“. „Best of followers“ usw.

---

### Lebenszyklus einer ListView

#### 1. Erste Aktivierung einer Liste

Ablauf beim ersten Klick auf einen Tab (z. B. „Popular with friends“):

 1. `activeListKey` wird auf den neuen Key gesetzt.
 2. Der State-Eintrag für diese Liste existiert noch nicht oder `loaded === false`.
 3. Es wird immer ein Initial-Refresh ausgelöst: 
    - `refreshListByKey(key, { scrollAfter: true })`
 4. Währenddessen zeigt die UI einen Ladezustand (Spinner/Skeleton).
 5. Nach erfolgreichem Fetch:
      - `items`, `cursor`, `topId` werden gesetzt,
      - `loaded = true`,
      - `hasNew = false`.

Ergebnis: Die Liste ist beim **ersten** Aktivieren sofort nutzbar, ohne zweiten Klick.

---

#### 2. Weitere Aktivierungen (erneutes Umschalten auf eine Liste)

Wenn eine Liste bereits `loaded === true` ist:
  - Beim Umschalten auf diese Liste:
    - **kein weiterer Request** nur wegen des Tabs.
    - Die vorhandenen `items` werden direkt gerendert (sofortiges Anzeigen).

  - Netzwerkzugriffe erfolgen nur explizit:
    - über Refresh (ScrollToTop/Home)
    - oder „Load more“.

---

#### 3. Polling

Das Polling ist zentralisiert in useListPolling und ist **nur für Früherkennung** zuständig:
  - Für jede ListView mit `supportsPolling === true`:
    - wird periodisch eine leichte Anfrage auf die aktuelle `topId` (oberstes Element) gestellt.
    - Wenn `serverTopId !== state.topId`:
      - wird `hasNew = true` gesetzt.

Wichtig:

  - Polling löst **kein automatisches Reload** aus
  - Polling markiert nur: „Für diese Liste gibt es neuere Einträge.“

UI-Reaktion:
  - Inaktive Listen → Badge/Marker am Tab (z. B. Timeline- oder Mitteilungs-Tab).
  - Aktive Liste → ScrollToTop-Button wird hervorgehoben / sichtbar.

---

#### 4. Refresh (Neue Einträge laden)

Ein Refresh wird ausgelöst durch:
  - ScrollToTop-Button (bei aktiver Liste, wenn `hasNew === true` oder explizit gewünscht).
  - Home-Button (aktuelle Liste aktualisieren und nach oben springen).

Ablauf:

1. `isRefreshing = true`
2. `runListRefresh` holt neue Einträge, mergen sie mit dem bestehenden State:
   - neue Items oben einfügen,
   - Duplikate nach id/uri entfernen,
   - `topId` auf den neuesten Eintrag setzen.

3. `hasNew = false`
4. `isRefreshing = false`
5. Scroll-Verhalten:
   - nach einem Refresh mit `scrollAfter: true` wird der Scroll-Container hart auf `scrollTop = 0` gesetzt.

---

#### 5. ScrollToTop-Button

Allgemeines Verhalten:
  - Gehört zum Layout der **aktiven** Liste (Bsky-Scroll-Container).
  - Sichtbar wenn:
    - der User weit genug nach unten gescrollt hat, **oder**
    - `hasNew === true` und `supportsRefresh === true`.

Klick-Verhalten:
  - Wenn `supportsRefresh === true` und `hasNew === true`:
    - Refresh wie oben beschrieben,
    - danach **direkter** Sprung nach oben (`scrollTop = 0`).
  - Wenn kein Refresh nötig:
    - nur harter Sprung nach oben (kein smooth scroll).

---

#### 6. Home-Button

Der Home-Button ist nur Navigation, **keine eigene Liste**.

Verhalten beim Klick:
  1. Falls der Benutzer nicht im Listen-/Timeline-Bereich ist:
     - zurück in den Listenbereich navigieren (z. B. „Home“-View mit aktiver Liste).
  2. Die aktuell aktive Liste (`activeListKey`) wird ermittelt.
  3. Wenn `supportsRefresh === true`:
     -  wird ein Refresh wie bei ScrollToTop ausgeführt (auch wenn `hasNew === false` → Home bedeutet: „Hol mir den aktuellen Stand“).
  4. Anschließend wird der Scroll-Container hart auf `scrollTop = 0` gesetzt.

---

### Technische Verankerung (Dateien)

Wichtige Stellen im Code:

#### Reducer / State:
  - `bsky-client/src/context/reducers/listView.js  `
    → globaler Listen-State (`activeListKey`, `lists`, Actions wie `LIST_LOADED`, `LIST_MARK_HAS_NEW`, …)

#### ListView-Services:
  - `bsky-client/src/modules/listView/listService.js`  
  → `runListRefresh`, `runListLoadMore`, gemeinsame Fetch-/Merge-Logik

#### API-Anpassungen / Polling:
  - `bsky-client/src/modules/shared/api/bsky.js`  
  → Timeline- und Notification-Calls, Top-ID-Abfragen für Polling

#### Zentrale Integration im Client:
  - `bsky-client/src/ClientApp.jsx`  
  → Tabs, `activeListKey`, Initial-Refresh beim ersten Aktivieren, Home-Button, ScrollToTop-Verhalten

#### Polling-Hook:
- `bsky-client/src/hooks/useListPolling.js`  
→ Top-ID-Checks für `hasNew`, ohne Auto-Reload

#### Views:
- `bsky-client/src/modules/timeline/Timeline.jsx`  
  → Timelines lesen direkt aus dem ListView-State, keine SWR-Abhängigkeit mehr
- `bsky-client/src/modules/notifications/Notifications.jsx`  
  → Mitteilungen nutzen dieselbe ListView-Logik, inkl. `hasNew` und `isRefreshing`

#### UI-Komponenten:
- `bsky-client/src/modules/layout/HeaderContent.jsx`  
  → Tabs, Badges, Home-Verhalten
- `bsky-client/src/modules/layout/BskyClientLayout.jsx`  
  → Scroll-Container (`bsky-scroll-container`)
- `packages/shared-ui/src/components/ScrollTopButton.jsx`  
  → ScrollToTop-Button, Hard-Scroll, optional Refresh-Trigger

---

### Zusammenfassung

- ListView bietet eine gemeinsame Basis für **alle** Listen im Client.
- Initiale Aktivierung lädt automatisch, ohne zweiten Klick.
- Polling erkennt nur „es gibt Neues“, lädt aber nicht automatisch nach.
- ScrollToTop und Home sorgen für konsistente Refresh- + Scroll-Logik.
- Timelines, Notifications und (später) Profil-Listen hängen alle an derselben Architektur.

--- 

### Hinweise

#### 1. Hinweis zur Wiederverwendbarkeit für Profil-Listen

Die Architektur ist so ausgelegt, dass künftige Profil-Listen (Posts, Likes, Reposts, Media) mit denselben Mechanismen laufen können, ohne die bestehende Logik zu verändern.

---

#### 2. Hinweis zur „UI-Vereinheitlichung als separatem Schritt“

Die UI der verschiedenen Listen (Timelines, Mitteilungen, Profilansichten) ist aktuell nicht vollständig vereinheitlicht. Daher ist die visuelle Harmonisierung ein separater, späterer Arbeitsschritt.

