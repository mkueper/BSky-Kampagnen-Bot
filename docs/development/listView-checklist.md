# Checkliste: Neue ListView integrieren / bestehende Liste anfassen

Diese Checkliste hilft dabei, eine neue Liste (Feed, Mitteilungen-Ansicht, Profil-Liste etc.) sauber an die bestehende ListView-Architektur anzubinden – oder eine bestehende Liste zu ändern, ohne etwas zu zerschießen.

---

### 1. Grundsatzfragen klären

Bevor du Code anfasst:

- [ ] **Was ist das für eine Liste?**
  - Timeline? Notifications? Profil? Custom?
- [ ] **Braucht die Liste Polling?**
  - Ja → `supportsPolling = true`
  - Nein → `supportsPolling = false`
- [ ] **Soll sie manuell refreshbar sein (Home/ScrollToTop)?**
  - Meistens Ja → `supportsRefresh = true`
  - Nur rein statisch? → `supportsRefresh = false`

---

### 2. ListView-Metadaten definieren

In `ClientApp.jsx` (oder dort, wo du Metadaten aufbaust):

- [ ] Einen stabilen `key` überlegen (z. B. `timeline:popular`, `profile:posts`, `notifs:mentions`).
- [ ] Einen Eintrag in der passenden Meta-Funktion ergänzen, z. B.:

```ts
  const getTimelineListMeta = useCallback((key) => {
    if (key === 'timeline:popular') {
      return {
        key,
        kind: 'timeline',
        label: 'Popular with friends',
        route: '/home',
        supportsPolling: true,
        supportsRefresh: true,
        data: {
          type: 'timeline',
          mode: 'popular'
        }
      }
    }
    // bestehende cases nicht anfassen
  }, [])
```

 - * [ ] Sicherstellen, dass `kind`, `label`, `route`, `supportsPolling`, `supportsRefresh` sinnvoll gesetzt sind.
 - * [ ] In data alle Infos hinterlegen, die listService braucht (z. B. type, filter, mode).

---

### 3. Reducer / ListView-State

Im `listView`-Reducer:  
- * [ ] Prüfen, ob es eine Initialisierung für die neue Liste braucht, oder ob Meta + Lazy-Init reicht.
- * [ ] Keine neuen Actions erfinden, solange es nicht wirklich nötig ist:
  - `LIST_LOADED`
  - `LIST_MARK_HAS_NEW`
  - `LIST_SET_REFRESHING`
  - `LIST_SET_LOADING_MORE`  
reichen in der Regel.

---

### 4. API-Fetch / Backend

In bsky.js / listService.js:  
- [ ] In listService prüfen:
  - Wird data.type / data.mode / data.filter für diese Liste bereits unterstützt?
  - Falls nicht → neuen Fall ergänzen, z. B.:

```ts
if (meta.data?.type === 'timeline' && meta.data.mode === 'popular') {
  return fetchTimelinePopular({ cursor, limit })
}
```

- [ ] Im Backend-Proxy (z. B. `backend/src/api/controllers/...`):
  - Route / Controller ggf. um neuen Modus erweitern.
  - Query-Parameter wie `cursor`, `limit`, 'filter' robust behandeln (optional, Defaults, Typkonvertierung).

---

### 5. UI-Einbindung (Tabs, Buttons, Navigation)

In den Layout-/Header-Komponenten:
- [ ]  Einen neuen Tab/Button für die Liste ergänzen (z. B. in `HeaderContent.jsx`):
  - `onClick` → `SET_ACTIVE_LIST(key)` + ggf. Initial-Refresh.
- [ ] Sicherstellen, dass der Tab:
  - den richtigen `key` verwendet,
  - `activeListKey` berücksichtigt (aktive Hervorhebung),
  - `hasNew`-Badge anzeigt, wenn `lists[key]?.hasNew === true`.

---

### 6. ScrollToTop / Home-Verhalten

- [ ] Prüfen, ob die Liste im gleichen Scroll-Container (`bsky-scroll-container`) liegt.
    - Wenn ja → ScrollToTop funktioniert automatisch mit.- Wenn nein → bewusst entscheiden, ob sie daran angeschlossen werden soll.
- [ ] sicherstellen, dass:
  - `supportsRefresh = true` gesetzt ist, wenn die Liste auf Home/ScrollToTop reagieren soll.
  - `refreshListByKey` für den neuen `key` einen `meta`-Eintrag findet.

---

### 7. Polling (falls aktiviert)

- [ ] In `useListPolling` prüfen, ob die Liste über `supportsPolling` automatisch erfasst wird.
- [ ] Sicherstellen, dass `fetchServerTopId` für diese Liste eine sinnvolle Top-ID liefert:
  - Bei Timelines: Top-Post-ID/URI
  - Bei Notifications: Top-Notification-ID
- [ ] Verhalten testen:
  - Neue Einträge erzeugen,
  - warten, bis Polling läuft,
  - `hasNew`-Badge und ScrollToTop-Signal beobachten.

---

### 8. UI-Tests – Standard-Szenario für jede neue ListView

Für jede neue Liste einmal diese Abfolge testen:

- [ ] Erster Klick auf den Tab:
  - Liste lädt (Loading-Zustand sichtbar),
  - Items erscheinen,
  - kein zweiter Klick nötig.

 - [ ] Wechsel auf andere ListViews und zurück:
  - Kein erneuter Fetch beim Zurückwechseln,
  - Liste erscheint sofort aus dem State.

- [ ] ScrollToTop:
  - Beim Runterscrollen erscheint der Button,
  - Klick → harter Sprung nach oben,
  - bei `hasNew === true`: Refresh + Sprung nach oben.

- [ ] Home-Button:
  - Aus dieser Liste → Home klicken:
    - Liste wird refresht (wenn `supportsRefresh === true`),
    - Scroll springt auf 0.

- [ ] Load More (falls unterstützt):
  - „Mehr laden“ am Ende → weitere Items erscheinen, ohne dass die Liste „springt“.

---

### 9. Typische Fehler & Symptome

- [ ] Symptom: Beim ersten Klick bleibt die Liste leer, erst der zweite Klick lädt.  
→ Ursache: `refreshListByKey` wird beim ersten Aktivieren nicht aufgerufen  
→ Fix: Nach `SET_ACTIVE_LIST(key)` explizit `refreshListByKey(key, { scrollAfter: true })` auslösen, wenn `!list || !list.loaded`.

- [ ] Symptom: Konsole zeigt 500er bei `…/notifications?filter=all&limit=1`.  
→ Ursache: Backend-Route unterstützt `limit/markSeen` (noch) nicht robust.  
→ Fix: Controller so anpassen, dass optionale Query-Parameter sauber geparst werden.

- [ ] Symptom: ScrollToTop springt, refresht aber nicht, obwohl neue Einträge da sind.  
→ Ursache: `hasNew` wird nicht gesetzt oder `supportsRefresh` ist false.  
→ Fix: Polling-/Meta-Konfiguration für die Liste prüfen.

---

### 10. Dokumentation nicht vergessen

- [ ] Einen Eintrag in der ListView-Architektur-Doku ergänzen:
  - Neuer `key`, Zweck der Liste, Besonderheiten (z. B. kein Polling, nur Profil).

- [ ] Optional: TODO notieren, falls die UI der neuen Liste später an den gemeinsamen ListView-Look angepasst werden soll.