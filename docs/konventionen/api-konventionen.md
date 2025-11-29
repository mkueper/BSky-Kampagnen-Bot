# BSky-Kampagnen-Bot – API-Konventionen (Backend)**

Diese Datei beschreibt die grundlegenden Konventionen für die interne und externe API-Gestaltung im Backend des BSky-Kampagnen-Bots.  
Sie dient als Referenz für menschliche Entwickler:innen.

---

## 1. Geltungsbereich

Diese Konventionen gelten für:

- alle HTTP-Endpunkte des Backends (REST/JSON),
- interne API-Module unter `backend/src/api/**`,
- service-interne API-Fassaden (z. B. Bluesky, Scheduler, Dashboard).

---

## 2. Allgemeine Prinzipien

1. **Explizit statt implizit**  
   Eingaben und Ausgaben sollen klar definiert sein; keine versteckten Seiteneffekte.

2. **Stabile Schnittstellen**  
   Bestehende APIs möglichst unverändert lassen; Breaking Changes nur mit klarer Begründung und Migrationspfad.

3. **Klarheit vor Kürze**  
   Bezeichner lieber länger, aber eindeutig; kryptische Kurzformen vermeiden.

---

## 3. HTTP-API-Konventionen

### 3.1 Routen und HTTP-Verben

- Routen im **kebab-case**, z. B.:  
  - /api/skeets/planned  
  - /api/skeets/sent  
  - /api/config/profile

- HTTP-Verben:
  - GET – lesen (keine Seiteneffekte)  
  - POST – erstellen / Aktionen auslösen  
  - PUT – vollständiges Aktualisieren  
  - PATCH – teilweises Aktualisieren  
  - DELETE – löschen

Keine mutierenden Seiteneffekte in GET-Requests.

### 3.2 Request- und Response-Format

- Standardformat: **JSON**
- Einheitliches Response-Schema:

```json
        {
          "data": {},
          "meta": {},
          "error": null
        }
```

- Fehler-Antworten:
```json
        {
          "data": null,
          "meta": null,
          "error": {
            "code": "SPEZIFISCHER_CODE",
            "message": "Kurze technische Beschreibung",
            "details": {}
          }
        }
```

Keine HTML-Ausgaben, außer bei explizit definierten Health-Checks.

---

## 4. Fehler- und Statuscodes

**Erfolgreich:**
- `200 OK` (Lesen),
- `201 Created` (Erstellen),
- `204 No Content` (erfolgreich, ohne Payload).

**Clientfehler:**
- `400 Bad Request` (ungültige Eingaben),
- `401 Unauthorized` (fehlende/ungültige Auth),
- `403 Forbidden` (keine Berechtigung),
- `404 Not Found` (Ressource existiert nicht),
- `409 Conflict` (z. B. doppelte Ressource).

**Serverfehler:**
- möglichst spezifisch  
- `500 Internal Server Error` nur als generischer Fallback

Keine sensiblen Daten in Fehlermeldungen oder Logs.

---

## 5. Validierung

- Alle Eingaben validieren, bevor Logik ausgeführt wird.
- Validierung möglichst zentral
  - zentral in Helpern oder Middelwares,
  - mit klaren Fehlermeldungen und spezifischen `error.code`-Werten. 
- Keine stillschweigende Korrektur von Eingaben; bei Unstimmigkeiten → Fehler zurückgeben.

---

## 6. Authentifizierung & Sicherheit

- Zugangsdaten (Tokens, Passwörter) **nur aus Umgebungsvariablen**.
- Niemals Secrets in Responses, Logs oder Fehlermeldungen ausgeben.
- API-Endpunkte klar trennen:
  - internes Admin-/Service-API (z. B. für Dashboard),
  - externe/öffentliche API (falls irgendwann relevant).

---

## 7. Logging & Tracing

- Fehler im Backend immer mit Kontext loggen:
  - Endpunkt / Funktion,
  - error code,
  - ggf. relevante IDs (ohne personenbezogene Details).
- Kein Logging von kompletten req.body, wenn dort personenbezogene oder sensible Daten stehen könnten.
  
---

## 8. Versionierung

- Wenn nötig, Versionierung in der Route:
  - /api/v1/...  
  - /api/v2/...
- Alte Versionen nur mit Plan entfernen (Deprecation-Pfad)

---

## 9. Interne APIs / Module

#### Für interne API-Fassaden (z. B. Bluesky-Client, Scheduler):

- Funktionale Schnittstellen klar typisieren (Parameter-Objekte statt „Argument-Salat“).
- Rückgaben als klar strukturierte Objekte:

  ```json
        {
          "ok": true/false,
          "data": ...,
          "error": ...
        }
  ```

- Keine unkontrollierten console.logs.

---

## 10. Wechselwirkungen mit anderen Konventionen

API-Konventionen sind ergänzend zu:

- coding-konventionen.md
- test-konventionen.md

Die Coding-Regeln gelten auch für API-Implementierungen (kein Refactoring ohne Auftrag, keine neuen Dependencies etc.).