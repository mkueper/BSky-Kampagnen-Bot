# MILESTONE 3 — Timeline-Refresh & „Neue Beiträge“-Logik

## Ziel des Milestones

Die Timeline-Logik erkennt neue Beiträge zuverlässig, zeigt sie klar an und lädt sie nur dann, wenn es sich lohnt.
Unterscheidung zwischen:

- Auto-Refresh/Monitoring (Polling/SSE → „es gibt Neues“)
- Manueller Refresh (User klickt → „lade jetzt die neuen Beiträge“)

---

## Issues

### Issue 1 – Struktur für `topUri` & „Has New“-Flag definieren

Die Basis für jede Refresh-Logik ist ein klarer Zustand für:

- „was ist oben im Feed aktuell sichtbar?“ (timelineTopUri)
- „was meldet der Server als obersten Beitrag?“ (serverTopUri)

#### Akzeptanzkriterien:

- Global oder pro Timeline: `topUri` sauber definiert (z. B. `currentTopUri`, `serverTopUri`)
- State-Felder klar benannt und dokumentiert
- Keine mehrfachen, konkurrierenden Felder für denselben Zweck

---

### Issue 2 – Polling-Mechanismus implementieren (nur Vergleich, kein Hard-Refresh)

Ein leichter Polling-Mechanismus fragt in einem festen Intervall nur die Meta-Info ab (z. B. „oberste URI“), nicht den kompletten Feed.

#### Akzeptanzkriterien:

- Polling ruft eine schlanke API-Funktion auf, die nur den aktuellen `serverTopUri` o. Ä. ermittelt
- Bei identischem Wert: keine Aktion
- Bei unterschiedlichem Wert: Setzen eines Flags wie `hasNewItems = true` für die betroffene Timeline
- Polling-Intervall konfigurierbar und nicht zu aggressiv

---

### Issue 3 – Globales „Neue Beiträge“-Flag für jede Timeline

Pro Timeline (Home, Following, Hashtag, etc.) soll ein eigenes „Neue Beiträge“-Flag existieren.

#### Akzeptanzkriterien:

- Pro Timeline ein eigener State wie `timeline.hasNew` (kein globaler Einheits-Flag)
- Setzen des Flags, wenn `serverTopUri !== timelineTopUri`
- Flags werden zurückgesetzt, wenn neue Beiträge geladen und angezeigt wurden

---

### Issue 4 – Anzeige der „Neue Beiträge“-Marker im UI

Die Information aus den Flags muss im UI sichtbar sein, ohne sofort zu reloaden.

#### Akzeptanzkriterien:

- Marker neben der aktiven Timeline (z. B. Badge, Punkt, Text „Neue Beiträge“)
- Klar erkennbar, aber nicht aufdringlich
- Marker verschwindet, wenn der User die neuen Beiträge explizit lädt

---

### Issue 5 – Manuelle Refresh-Aktion implementieren

Beim Klick auf „Home“, „Aktualisieren“ oder vergleichbaren Button soll der Client:

- prüfen, ob neue Beiträge vorhanden sind
- bei Bedarf die Timeline nachladen

#### Akzeptanzkriterien:

- Bei Klick → wenn `hasNewItems == true`: Lade neue Beiträge und aktualisiere `timelineTopUri`
- Bei Klick → wenn `hasNewItems == false`: Kein unnötiger Reload (Optional: kurzer Hinweis „Keine neuen Beiträge“)
- Nach dem Laden neuer Beiträge: `hasNewItems` für diese Timeline zurückgesetzt

---

### Issue 6 – Zusammenspiel mit SSE klären

Wenn SSE aktiv ist, soll Polling reduziert oder deaktiviert werden, um doppelte Arbeit zu vermeiden.

#### Akzeptanzkriterien:

- Wenn `sseConnected == true`: Polling reduziert/deaktiviert (nur Monitoring per SSE)
- SSE-Events aktualisieren die „Neue Beiträge“-Flags, nicht automatisch den ganzen Feed
- Bei `sseConnected == false`: Polling springt wieder an, ohne Fehler

---

### Issue 7 – Performance: Kein Komplett-Refetch ohne Not

Beim Laden neuer Beiträge soll nicht jedes Mal der komplette Feed mit voller Länge neu geladen werden, wenn es sich vermeiden lässt.

#### Akzeptanzkriterien:

- Neue Beiträge werden möglichst als „prepend“ (oben einfügen) behandelt, nicht Full-Reload
- Falls die API kein partielles Nachladen erlaubt: klar dokumentiert
- Kein doppeltes Einfügen von Beiträgen (keine Duplikate nach Refresh)

---

### Issue 8 – Fehlerbehandlung im Refresh-Mechanismus

Fehler bei Polling/Refresh dürfen das UI nicht instabil machen.

#### Akzeptanzkriterien:

- Fehlgeschlagene Polling-Requests führen nicht zu UI-Abstürzen
- Optional: dezente Error-Anzeige (Toast/Log), kein „rotes Vollalarm-Banner“
- Refresh-Buttons bleiben bedienbar, auch nach einem Fehler

---

### Issue 9 – Scrollposition & „Neue Beiträge“

Wenn neue Beiträge erkannt werden, darf der Feed nicht ungefragt „springen“.

#### Akzeptanzkriterien:

- Erkennung neuer Beiträge verändert die Scrollposition nicht
- Beim expliziten Laden neuer Beiträge: Verhalten definiert
  - Entweder: Scrollt nach oben
  - Oder: zeigt eine Zwischenleiste „X neue Beiträge – hier klicken“
- Gewähltes Verhalten dokumentiert

---

### Issue 10 – Tests & Dokumentation der Refresh-Logik

Damit die Logik später nachvollziehbar bleibt, braucht es minimale Tests und eine knappe Doku.

#### Akzeptanzkriterien:

- Einheitliche Stelle (Reducer/Hook), an der die Refresh-Logik dokumentiert ist (z. B. Kommentar oder kurze MD-Datei)
- Smoke-Tests/Manuelle Test-Checkliste:
  - Keine neuen Beiträge → kein Badge
  - Neue Beiträge → Badge + kein Sprung
  - Refresh-Klick → lädt neue Beiträge & Badge weg
- Zusammenspiel mit M2 (Layout & Pane-Struktur) einmal manuell überprüft