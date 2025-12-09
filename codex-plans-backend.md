# Codex Plan – Backend / Fehlercodes & i18n

---

## 1. Datum (TT.MM.JJJJ)

09.12.2025

## 2. Status (aktueller Stand, keine ToDos)

- Auth-Service und Login-API verwenden jetzt konsistente Fehlercodes (`AUTH_NOT_CONFIGURED`, `AUTH_MISSING_CREDENTIALS`, `AUTH_INVALID_CREDENTIALS`, `AUTH_SESSION_REQUIRED`) und liefern zusätzlich eine menschenlesbare `message`.
- Das Dashboard-Login verarbeitet diese Fehlercodes explizit, mappt sie auf lokalisierte Texte (`login.errors.*`) und zeigt nur noch i18n-basierte Meldungen an; Rohtexte aus dem Backend dienen als Fallback.
- Die Settings-API (`/api/settings/scheduler`, `/api/settings/general`, `/api/settings/client-polling`) verwendet konsistente Fehlercodes der Form `SETTINGS_*`; das Dashboard zeigt diese über dedizierte i18n-Keys an.
- Die wichtigsten Bluesky-Endpunkte (Reaktionen, Post/Reply, Timeline, Threads, Profile, Feeds, Suche, Notifications, Blocks, Push) liefern nun eindeutige `BLSKY_*`-Fehlercodes; die Reaktionen werden im `bsky-client` bereits codesensitiv ausgewertet.
- Import/Export von Skeets und Threads (`/api/skeets/…`, `/api/threads/…`) gibt strukturierte Fehler mit `IMPORT_EXPORT_*`-Codes zurück; das Dashboard verwendet diese für lokaliserte Toast-Meldungen beim Import/Export.
- Upload- und Tenor-Endpunkte liefern einheitliche Fehlercodes (`UPLOAD_*`, `TENOR_*`) zusätzlich zu menschenlesbaren Texten; das Verhalten bestehender Clients bleibt unverändert.
- Für temporäre Uploads (`TEMP_UPLOAD_DIR`) existiert ein Garbage-Collector (`cleanupOldTempUploads`) und ein Maintenance-Endpunkt (`POST /api/maintenance/cleanup-temp-uploads`), der alte Dateien (Standard: älter als 24 h) entfernt.
- Backend-Tests für Auth, Settings, Bluesky-API und Import/Export sind auf das neue Fehlerformat aktualisiert; `npm test` und `npm run lint` laufen grün.

## 3. Startpunkt (kurze Einleitung für die nächste Session)

Login/Auth und Settings dienen inzwischen als Referenz für Backend-Fehlercodes und i18n-Anbindung: Codes sind stabil, Tests sichern das Verhalten ab und das Dashboard zeigt lokalisierte Meldungen an. Bluesky-spezifische Endpunkte sowie Import/Export sind auf das gleiche Schema umgestellt und in der API-Dokumentation beschrieben. In den nächsten Sessions können wir verbleibende Spezialpfade (z. B. Uploads und Tenor-Proxy) in das Schema einordnen und bei Bedarf weitere Feinschliffe (z. B. zentraler Fehlercode-Katalog) vornehmen – ohne bestehende Clients zu brechen.

## 4. Nächste Schritte (konkrete, umsetzbare ToDos)

1. Bestehende UI-Hinweise zu GIF- und Medienfehlern im Dashboard und `bsky-client` an die neuen `UPLOAD_*`- und `TENOR_*`-Fehlercodes koppeln, damit Upload-/GIF-Probleme konsistent lokalisiert angezeigt werden.

## 5. Abschluss-Check (prüfbare Kriterien, optional)

- Auth-/Login-Fehlercodes sind in der API-Dokumentation erwähnt und werden im Dashboard ausschließlich über i18n-Texte dargestellt.
- Mindestens ein weiterer API-Bereich (z. B. Settings-API) verwendet das neue Fehlerformat konsistent, inklusive aktualisierter Tests.
- In den Logs sind Fehler anhand von Codes schneller auffindbar und lassen sich sauber von technischen Detailmeldungen trennen.
- Frontend-Tests (Dashboard) decken mindestens einen Pfad ab, bei dem ein spezifischer Backend-Fehlercode in eine lokalisierte Meldung übersetzt wird.

## 6. Offene Fragen (keine Tasks)

- Welche Fehlercodes sollen als „stabil“ gelten und in zukünftigen Major-Versionen unverändert bleiben, damit externe Integrationen sich darauf verlassen können?
- Sollen wir mittelfristig einen zentralen Katalog für Fehlercodes (z. B. `backend/src/constants/errorCodes.js`) einführen, um Dopplungen und Tippfehler zu vermeiden?
- Wie weit wollen wir mit Backend-i18n bei Fehlermeldungen gehen, wenn primär die Frontends für die Darstellung zuständig sind – reichen Codes + technische `message`, oder wünschen wir serverseitig ebenfalls lokalisierte Varianten?
