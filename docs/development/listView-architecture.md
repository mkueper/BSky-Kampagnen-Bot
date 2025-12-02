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

### Duplikat-Entfernung und Merge-Strategie

Beim Zusammenführen neuer Items mit dem bestehenden Listen-State werden doppelte Einträge anhand stabiler Identifier erkannt und verworfen. Die Architektur folgt dabei einer klar definierten, stabilen Merge-Logik.

#### Schlüssel für die Duplikaterkennung

Ein Eintrag gilt als Duplikat, wenn mindestens einer der folgenden eindeutigen Identifier übereinstimmt:

1. `uri`  – Primärer Identifier bei Bluesky-Timelines
2. `cid`  – Sekundärer Identifier (Content Identifier), falls keine URI vorhanden ist

Formal gilt:

```js 
sameEntry = (a.uri === b.uri) || (a.cid === b.cid)
```


#### Merge-Strategie beim Refresh

Beim Refresh werden neue Einträge grundsätzlich **oben** eingefügt. Bestehende Einträge bleiben unverändert weiter unten stehen.

Ablauf:

1. Der Server liefert neue Items von „neu nach alt“.
2. Für jedes neue Item:
   - Wenn kein Eintrag mit gleicher `uri` oder `cid` existiert → **oben einfügen**.
   - Wenn ein Duplikat existiert → **überspringen** (nicht aktualisieren, nicht verschieben).
3. Alte Einträge werden **nicht neu sortiert** und bleiben an ihren bisherigen Positionen.

#### Warum keine Sortierung nach Timestamps?

- Bluesky garantiert Reihenfolge nur innerhalb der gelieferten Antwort, nicht global.
- Timestamps sind nicht zuverlässig vergleichbar.
- Ein globales Resorting führt zu visuell verwirrenden Sprüngen.

Daher erfolgt **keine Sortierung über alle Items hinweg**.

#### Umgang mit unterschiedlicher Reihenfolge vom Server

Wenn der Server bekannte Items in anderer Reihenfolge liefert (Refresh/Timeline-Fetch):

- Nur echte neue Einträge werden verwendet.
- Unterschiedliche Reihenfolgen bei bereits bekannten Einträgen werden bewusst ignoriert.
- So bleibt der Feed stabil und springt nicht hin und her.

#### Begründung der Gesamtstrategie

- Posts auf Bluesky sind unveränderlich → es gibt keinen legitimen Grund, ältere Einträge zu überschreiben oder umzuschichten.
- Die Strategie verhindert doppelte Posts, visuelle Sprünge und ungewünschte Sortierartefakte.
- Das Verfahren bleibt performant (O(n)) und führt zu einer stabilen, vorhersehbaren UI.

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

## Known Limitations

Die aktuelle ListView-Architektur ist stabil, aber besitzt bewusst akzeptierte Einschränkungen, die bei zukünftigen Erweiterungen berücksichtigt werden müssen:

1. **Kein globales Resorting nach Zeitstempeln**  
   Die Reihenfolge entspricht ausschließlich der Reihenfolge, die der Server bei Refresh- oder „Load more“-Anfragen liefert. Eine nachträgliche Sortierung der gesamten Liste findet nicht statt.

2. **Unzuverlässige Timestamps in API-Rückgaben**  
   Da Bluesky keine global konsistente Zeitordnung garantiert, können Listen nicht anhand von `createdAt` sauber sortiert werden. Die Architektur vermeidet dieses Risiko bewusst.

3. **Polling erzeugt nur Früherkennung, aber keine Datenaktualisierung**  
   Polling markiert neue Einträge mit `hasNew`, lädt diese aber nicht automatisch. Ohne Benutzereingriff (ScrollToTop/Home) bleibt die Liste veraltet.

4. **Kein automatischer Fehler- oder Recovery-Mechanismus**  
   Fehler bei Fetch, Cursor oder Netzwerk werden im UI nicht gesondert dargestellt.  
   Die Architektur erwartet stillen Fehler-Umgang im Hintergrund. Dies ist beabsichtigt, um die UI nicht mit Fehlerdialogen zu überladen.

5. **Merge-Strategie verhindert Updates existierender Items**  
   Da Bluesky-Posts unveränderlich sind, werden vorhandene Items nie neu geladen oder aktualisiert.  
   Sollte die Plattform zukünftig mutierbare Felder einführen (z. B. Edit-Hinweise), müsste dies erweitert werden.

6. **Keine Live-Synchronisation zwischen Listen**  
   Änderungen in einer Liste (z. B. Entfernen eines Items) führen nicht automatisch zu UI-Anpassungen in anderen Listen. Jede ListView verwaltet ihren eigenen State.

7. **Keine garantierte Konsistenz bei extrem schnellen Refresh-Vorgängen**  
   Mehrere Refreshes in enger Abfolge können dazu führen, dass Polling-Resultate oder Cursor-Positionen kurzzeitig hintereinander widersprüchliche Zwischenzustände erzeugen.  
   Der Zustand korrigiert sich beim nächsten vollständigen Refresh oder „Load more“-Durchlauf automatisch.

8. **Profil-Listen noch nicht vollständig integriert**  
   Die Architektur ist dafür vorbereitet, aber Profil-Feeds nutzen teilweise noch eigene Logik und werden später konsolidiert.

Dieser Abschnitt beschreibt bewusst akzeptierte Einschränkungen, die aus Stabilitäts-, Performance- und UX-Gründen Teil des aktuellen Designs sind.

## Fehlerbehandlung (Error Handling)

Die ListView-Architektur besitzt ein bewusst einfach gehaltenes Fehlerverhalten. Fehler sollen den Ablauf nicht unterbrechen und die UI nicht übermäßig komplex machen. Statt sofortige UI-Reaktionen zu erzwingen, wird ein leichtgewichtiges Fehlermanagement mit automatischer Selbstkorrektur.

### Fetch-Fehler (Initial Load, Refresh, Load More)

- Fehler beim Laden neuer Items führen **nicht** zu UI-Fehlermeldungen.
- Der State bleibt unverändert (`items`, `cursor`, `topId`).
- `isRefreshing` oder `isLoadingMore` werden am Ende trotzdem sauber zurückgesetzt.
- Die UI zeigt weiterhin die vorhandenen (zuletzt gültigen) Inhalte an.

Typische Ursachen (Serverfehler, Timeout, ungültige Cursor) werden still abgefangen.  
Der nächste erfolgreiche Refresh korrigiert den Zustand automatisch.

### Cursor-Fehler („Load more“)

Wenn der Server einen ungültigen oder abgelaufenen Cursor liefert:

- Die Operation wird beendet.
- `isLoadingMore` wird zurückgesetzt.
- Die Liste bleibt wie sie ist.
- Keine visuelle Fehlermeldung.

### Polling-Fehler

- Ein fehlgeschlagener Polling-Request hat **keine Auswirkungen** auf die UI.
- `hasNew` bleibt unverändert.
- Es findet kein Retry statt; der nächste Polling-Intervall versucht es erneut.

### Netzwerkverlust

- Es gibt keine Offline-UI.
- Refresh- oder Load-more-Aufrufe schlagen still fehl.
- Der Zustand bleibt konsistent, weil keine Teildaten übernommen werden — fehlgeschlagene Loads resultieren immer in einem No-Op.

### Selbstheilung durch Refresh

Die Architektur geht davon aus, dass ein regulärer Refresh oder ein Home-Klick den Zustand jederzeit wieder reparieren kann.  
Fehler erzeugen keine persistente Inkonsistenz.

---

### Hinweise

#### 1. Hinweis zur Wiederverwendbarkeit für Profil-Listen

Die Architektur ist so ausgelegt, dass künftige Profil-Listen (Posts, Likes, Reposts, Media) mit denselben Mechanismen laufen können, ohne die bestehende Logik zu verändern.

---

#### 2. Hinweis zur „UI-Vereinheitlichung als separatem Schritt“

Die UI der verschiedenen Listen (Timelines, Mitteilungen, Profilansichten) ist aktuell nicht vollständig vereinheitlicht. Daher ist die visuelle Harmonisierung ein separater, späterer Arbeitsschritt.
