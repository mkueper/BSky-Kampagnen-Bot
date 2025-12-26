# Release Notes – BSky Client v1.1.2

## Highlights
- Neuer Auth-Stack mit zentralem `AuthContext`, Multi-Account-Verwaltung und überarbeitetem Login-Flow (App-Passwort-Pflicht, Reminder-Links, persistente Sessions).
- Beta-Desktop-Builds für Linux (AppImage) und Windows (Setup.exe) mit klar dokumentierten Build-Skripten sowie Sandbox-Verhalten; keine manuellen `--no-sandbox`-Flags mehr nötig.

## Neue Funktionen
- Integrierte Chat-Ansicht (Conversation Pane, Chat-Liste, Header, Polling) inklusive eigener Navigation und State-Verwaltung.
- Composer verfügt nun über ein Post-Interaction-Settings-Modal mit dedizierten Hooks (Standard-Reaktionen, Sichtbarkeit, Queue-Steuerung).
- Neues Client Settings Modal für Theme-, Badge- und Verhaltensoptionen.
- Erweiterte Suche: Prefix-Hints aus neuen JSON-Dateien, aktualisierter `SearchContext` und verbesserte UI für Hashtag-/Profil-Suche.

## Verbesserungen
- Konsolidiertes ListView-/Timeline-Management: `ClientApp`, `AppContext` und `listService` koordinieren Refresh, Polling und Badges konsistent; Notifications, Profile und Composer reagieren schneller auf State-Änderungen.
- Umfangreicheres Test-Set (SidebarNav, TimelineHeader, Composer-Interaktionen, Profilaktionen) erhöht die Stabilität.
- Electron-Hauptprozess trennt den Client vom Backend, nutzt einen eigenen Entry (`main-bsky-client`), temporäre Bridge-Dateien und Fensterzustands-Persistenz.
- Dokumentation erweitert: `.env.sample` enthält neue Scheduler-/Client-Variablen, `docs/beta-client.md` erklärt Build/Sandbox, `bsky-client/Handbuch.md` beschreibt die Bedienung, `notes/refacor-strategie.md` skizziert den Fahrplan.

## Downloads
- **Linux (AppImage):** `BSky Client Beta-1.1.2.AppImage`
- **Windows (Setup):** `BSky Client Beta Setup 1.1.2.exe`

Beide Artefakte liegen nach dem Build unter `dist/` und sollten dem Release als Assets hinzugefügt werden.

## Wichtige Hinweise
- Alte `useSession`-Hooks wurden entfernt; Integrationen müssen auf den neuen `AuthContext`/Provider umstellen.
- Der Client trennt sich stärker vom Backend: API-Calls laufen über die neuen `bsky`-Module und lokale Temp-Speicher; Backend-Endpunkte werden für Auth/Timeline nicht mehr verwendet.
