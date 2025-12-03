# Tests – bsky-client (`bsky-client/__tests__`)

Diese Datei dokumentiert die vorhandenen Tests im Ordner `bsky-client/__tests__`.
Jeder Abschnitt beschreibt eine Testdatei, die zugehörige Komponente bzw. den fachlichen Bereich,
die fachlichen Anforderungen (Architektur/Fachkonzept) und die aus der Implementierung abgeleiteten Anforderungen.
Neue Tests sollten durch Hinzufügen eines weiteren Abschnitts im selben Format ergänzt werden
(Überschrift `## <Pfad>`, Komponente/Bereich, **Anforderungen (Architektur/Fachkonzept)**,
**Anforderungen (aus Implementierung)**, **Konzept-Abgleich**).

**Vereinbarung:** Diese Datei dient als fachliche Referenz für Änderungen am Code.
- Dokumentarische Anpassungen (Beschreibungen, Ergänzungen der Anforderungen) sind erlaubt.
- Wenn für eine Komponente der Block `**Anforderungen (Architektur/Fachkonzept):**` fehlt oder nur `**TBD**` enthält,
  DÜRFEN Agenten daraus keine Implementierungsänderungen (Code/Tests) ableiten und MÜSSEN den Auftraggeber auf die fehlende fachliche Definition hinweisen.

---

## bsky-client/__tests__/components/BskyClientLayout.notificationsBadge.test.jsx

**Komponente/Bereich:** `BskyClientLayout` – Notifications-Badge in SidebarNav und MobileNavBar.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass der Notifications-Badge sowohl in der Desktop-Sidebar als auch in der mobilen NavBar konsistent angezeigt wird.
- Prüft, dass bei `notificationsUnread > 0` der Badge mit korrektem Zähler und ARIA-Label gerendert wird.
- Stellt sicher, dass bei `notificationsUnread = 0` der Badge visuell ausgeblendet und das ARIA-Label ohne Zähler bleibt.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/components/ComposeModal.test.jsx

**Komponente/Bereich:** Compose-Modal für das Erstellen von Skeets.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass das Modal korrekt öffnet/schließt und Eingaben annimmt.
- Stellt sicher, dass relevante Buttons (Posten, Abbrechen) sichtbar sind und erwartete Aktionen auslösen.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/components/MediaLightbox.test.jsx

**Komponente/Bereich:** `MediaLightbox` – Anzeige von Bildern/Videos im Overlay.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert Keyboard-Navigation (Escape, Pfeil-links, Pfeil-rechts) und verkabelte `onClose`/`onNavigate`-Callbacks.
- Prüft, dass im Bildmodus passende Buttons („Vorheriges/Nächstes Bild“) gerendert und korrekt reagieren.
- Stellt sicher, dass im Videomodus ein `<video>`-Element gerendert wird, wenn das Item als Video erkannt wird.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/components/ProfilePosts.test.jsx

**Komponente/Bereich:** `ProfilePosts` – Anzeige der Posts in einem Profil.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft Rendering der Posts für ein Profil inkl. grundlegender Interaktionen (Scroll, Klick).
- Stellt sicher, dass leere bzw. Ladezustände sinnvoll dargestellt werden.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/components/RichText.hashtagSearch.test.jsx

**Komponente/Bereich:** `RichText` – Hashtag-Menü und Navigation zur Hashtag-Suche.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass das „Hashtag-Posts ansehen“-Menü `OPEN_HASHTAG_SEARCH` mit korrekt aufgebautem Payload dispatcht.
- Prüft, dass „Hashtag-Posts des Nutzers ansehen“ mit `hashtagContext.authorHandle` eine Query vom Typ `from:<handle> #tag` dispatcht.
- Stellt sicher, dass bei `disableHashtagMenu` keine Hashtag-Navigation ausgelöst wird.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/components/Timeline.test.jsx

**Komponente/Bereich:** `Timeline` – Haupt-Timeline-Feed.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass während des initialen Ladens Platzhalter/Skeletons angezeigt werden.
- Prüft, dass geladene Items nach dem Fetch sichtbar gerendert werden.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/context/hashtagSearch.test.jsx

**Komponente/Bereich:** `AppContext` – Hashtag-Suche (`hashtagSearch`-Slice).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass `OPEN_HASHTAG_SEARCH` den State mit normalisiertem Query, Label, Beschreibung und Tab (`top`/`latest`) setzt.
- Stellt sicher, dass leere Queries ignoriert werden und der vorherige State erhalten bleibt.
- Verifiziert, dass `CLOSE_HASHTAG_SEARCH` nur `open=false` setzt, ohne Metadaten zu verlieren.
- Prüft, dass `OPEN_PROFILE_VIEWER` eine offene Hashtag-Suche automatisch schließt.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/context/listViewReducer.test.js

**Komponente/Bereich:** `listViewReducer` – Listen- und Timeline-State.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert `SET_ACTIVE_LIST` inklusive Lazy-Erstellung neuer Listen-Einträge.
- Prüft `LIST_LOADED` (Items, Cursor, `topId`, Meta-Merge, `hasNew`-Handling).
- Testet Status-Flags wie `isRefreshing` und `isLoadingMore`.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/context/notificationsReducer.test.js

**Komponente/Bereich:** `notificationsReducer` – globaler Notifications-Status.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass `REFRESH_NOTIFICATIONS` den Refresh-Tick erhöht.
- Stellt sicher, dass `SET_NOTIFICATIONS_UNREAD` die globale Unread-Zahl setzt und zurücksetzen kann.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/hooks/useComposer.test.jsx

**Komponente/Bereich:** Hook `useComposer` – Logik für den Compose-Flow.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass der Reply-Composer geöffnet wird und Quote-Kontext zurückgesetzt wird.
- Verifiziert Normalisierung von Quote-Quellen vor dem Öffnen (URI, CID, Text, Autor).
- Stellt sicher, dass invalides Quote-Input ignoriert wird.
- Prüft Schließen des Composers inkl. Reset von Reply-/Quote-Targets.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/hooks/useMediaLightbox.test.jsx

**Komponente/Bereich:** Hook `useMediaLightbox` – Steuerung des Media-Lightbox-State.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert, dass `openMediaPreview` mit Bildliste und Startindex den Lightbox-State öffnet und den Index auf gültige Werte normalisiert.
- Stellt sicher, dass Aufrufe mit leerer/ungültiger Liste ignoriert werden.
- Prüft, dass `closeMediaPreview` nur `open=false` setzt und Bilder/Index unverändert lässt.
- Testet `navigateMediaPreview` (Ring-Navigation vor/zurück).

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/hooks/useThread.test.jsx

**Komponente/Bereich:** Hook `useThread` – Thread-Ansicht und -Navigation.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass `loadThread` Thread-Daten lädt, `threadState` setzt und Metadaten (Autor-Infos, Flags) korrekt berechnet.
- Verifiziert, dass `selectThreadFromItem` bei erneutem Aufruf mit derselben URI keinen doppelten Load auslöst.
- Testet `closeThread` inkl. History-Stack (Zurückspringen zum vorherigen Thread).
- Prüft, dass `reloadThread` den aktuellen Thread neu lädt, ohne History zu verändern.
- Stellt sicher, dass `setThreadViewVariant` die `threadViewVariant` im globalen State aktualisiert und nur Strings akzeptiert.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/integration/Notifications.test.jsx

**Komponente/Bereich:** `Notifications`-Modul – Integrations-Tests (Liste, Tabs, Interaktionen).

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Verifiziert Rendering der Notifications-Liste für verschiedene Tabs (z.B. „All“, „Mentions“).
- Prüft das Zusammenspiel mit `AppContext`, `I18nProvider`, SWR und Engagement-Hooks.
- Testet Card-Interaktionen (Thread öffnen, Reply/Quote, Medien-Lightbox, Profil-Viewer).
- Überprüft, dass Notification-spezifische Systemmeldungen und Fehler angezeigt werden.

**Konzept-Abgleich:** offen

---

## bsky-client/__tests__/integration/SearchView.test.jsx

**Komponente/Bereich:** `SearchView` – Suchoberfläche im bsky-client.

**Anforderungen (Architektur/Fachkonzept):**
- **TBD**

**Anforderungen (aus Implementierung):**
- Prüft, dass Suchergebnisse geladen und im richtigen Layout dargestellt werden.
- Verifiziert, dass `useMediaLightbox` und andere Hooks korrekt integriert sind.
- Stellt sicher, dass grundlegende Nutzerinteraktionen (eingeben, Tabs wechseln) funktionieren.

**Konzept-Abgleich:** offen
