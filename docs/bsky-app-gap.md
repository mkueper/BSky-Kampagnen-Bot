# bsky.app Funktionsabgleich (Client)

Hinweis: Stand basiert auf dem aktuellen Code in `bsky-client`. Feeds und Listen sind bewusst ausgenommen und werden hier nicht bewertet.

## Timeline

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Post-Liste mit Karten, Thread oeffnen | Umgesetzt | Skeet-Liste und Thread-Auswahl sind vorhanden. |
| Antworten, Repost, Quote, Like | Umgesetzt | Footer-Aktionen in `SkeetItem.jsx`. |
| Lesezeichen (Merken) | Umgesetzt | Bookmark-Button vorhanden. |
| Teilen-Menue | Umgesetzt | Inline-Menue mit Share-Optionen. |
| Uebersetzen | **TEILWEISE** | Nur mit konfiguriertem Uebersetzungsdienst; sonst Placeholder. |
| Account stummschalten / blockieren | Umgesetzt | Aktionen vorhanden. |
| Weitere Aktionen (anheften, Interaktions-Settings, mehr/weniger anzeigen, Thread stummschalten, Woerter stummschalten, Post ausblenden, Post melden) | **FEHLT** | Aktuell nur Placeholder-Meldung im Optionen-Menue. |

## Mitteilungen

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Mitteilungs-Liste inkl. Post-Card | Umgesetzt | Eintraege werden gerendert, inkl. Post-Card. |
| Footer-Aktionen wie in Timeline | Umgesetzt | Reply/Repost/Quote/Like/Bookmark/Share sind vorhanden. |
| Uebersetzen | **TEILWEISE** | Nur mit konfiguriertem Uebersetzungsdienst; sonst Placeholder. |
| Weitere Aktionen (anheften, Interaktions-Settings, mehr/weniger anzeigen, Thread stummschalten, Woerter stummschalten, Post ausblenden, Post melden) | **FEHLT** | Placeholder im Optionen-Menue. |
| Badge-Zähler / Ungelesen | Umgesetzt | `useNotificationPolling` trennt Badge-Counts vom Snapshot-Polling, sodass die Zähler auch bei inaktiver Mitteilungssektion weiterlaufen. |

## Composer

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Text posten, Antworten, Zitieren, Thread | Umgesetzt | Thread-Umwandlung und Reply/Quote-Flow vorhanden. |
| Bilder + GIFs (Tenor) | Umgesetzt | Datei-Upload, Tenor-GIFs und Vorschau. |
| Alt-Text fuer Medien | Umgesetzt | Alt-Dialog vorhanden. |
| Emoji-Picker | Umgesetzt | Emoji-Auswahl vorhanden. |
| Interaktions-Settings (Wer darf antworten/quoten) | Umgesetzt | Post-Interaktions-Modal vorhanden. |
| Link-Preview | **TEILWEISE** | Verfuegbar, wenn ein Preview-Fetcher konfiguriert ist (z.B. `VITE_PREVIEW_PROXY_URL` oder `window.__BSKY_PREVIEW_*`); ohne Konfiguration erscheint eine Standalone-Meldung. |
| Video-Upload | **FEHLT** | Keine Video-Upload-Logik im Composer. |

## Profile

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Profilansicht, Stats, Posts | Umgesetzt | Profilansicht mit Post-Tab. |
| Link zum Profil kopieren | Umgesetzt | Profil-Menue vorhanden. |
| Account stummschalten / blockieren | Umgesetzt | Aktionen vorhanden. |
| Folgen/Entfolgen | **FEHLT** | Button ist deaktiviert ("bald verfuegbar"). |
| Profil-Benachrichtigungen verwalten | **FEHLT** | Bell-Button deaktiviert. |
| Nachricht senden | **FEHLT** | Chat-Button deaktiviert. |
| Profil-Posts durchsuchen | **FEHLT** | Menuepunkt deaktiviert. |
| Account melden | **FEHLT** | Menuepunkt deaktiviert. |

## Suche

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Post-Suche (Top/Neueste) | Umgesetzt | Tabs und Trefferlisten vorhanden. |
| Personen-Suche | Umgesetzt | People-Tab vorhanden. |
| Hashtag-Suche | Umgesetzt | Hashtag-Pane mit Tabs (Top/Neueste). |
| Zuletzt gesucht / Profil-Historie | Umgesetzt | Historie und Loeschen vorhanden. |
| Offensichtliche Luecken | Unklar | Im Code keine Placeholder erkennbar. |

## Chat

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Konversationsliste, Laden weiterer Chats | Umgesetzt | List View mit Load-More. |
| Konversationsansicht, Senden von Nachrichten | Umgesetzt | Chat-Composer vorhanden. |
| Reaktionen (Emoji) | Umgesetzt | Add/Remove Reaction implementiert. |
| Chat-Einstellungen (wer darf schreiben) | **TEILWEISE** | UI vorhanden, aber nur lokaler State. |
| Nachricht uebersetzen / kopieren / loeschen / melden | **FEHLT** | Aktionen sind Placeholder. |
| Konversation stummschalten / blockieren / melden / verlassen | **FEHLT** | Menue-Aktionen sind Placeholder. |

## Einstellungen

| Funktion (bsky.app) | Status im Client | Hinweis |
| --- | --- | --- |
| Blockliste einsehen und entblocken | Umgesetzt | `BlockListView.jsx` vorhanden. |
| Client-Settings (Layout/Medien/Externe Dienste) | Umgesetzt | `ClientSettingsModal.jsx` vorhanden. |
| Allgemeine Einstellungen-Seite | **TEILWEISE** | `SettingsView.jsx` ist eine Platzhalter-Seite (keine konfigurierbaren Optionen). |
| Benachrichtigungs-Praeferenzen / Activity-Subscriptions | **FEHLT** | API-Routen nicht verfuegbar (siehe `bsky.js`). |
