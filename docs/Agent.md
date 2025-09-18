# Kampagnen-Agent

Der Kampagnen-Agent ist die Automatisierungsschicht des Projekts. Er koordiniert Planung, Speicherung und Veröffentlichung von Kampagneninhalten auf Bluesky und bildet die Grundlage für weitere Plattform-Integrationen.

---

## Rolle & Verantwortlichkeiten

- **Planung umsetzen:** Zeitsensitive Veröffentlichung einzelner Skeets oder kompletter Threads durchführen.
- **Mandanten trennen:** Kampagnen, Accounts und Zugangsdaten tenant-spezifisch verwalten.
- **Sicherheit gewährleisten:** Zugangsdaten verschlüsseln, Logins absichern und Wiederholungsversuche kontrollieren.
- **Monitoring bereitstellen:** Status-Updates, Logs und Analysedaten für das Dashboard liefern.
- **Plattformen abstrahieren:** Schnittstellen kapseln, um neben Bluesky weitere Plattformen anbinden zu können.

---

## Kernaufgaben

| Bereich            | Beschreibung |
|--------------------|--------------|
| **Skeets & Threads** | Posts validieren, Unicode-Grapheme zählen, Medienanhänge samt Alt-Texten verarbeiten. |
| **Scheduler**        | Jobs nach Zeitzone terminieren, Retries mit Backoff steuern und Ergebnisse zurückmelden. |
| **Multi-Tenancy**    | Mandanten- und Benutzerkontexte erzwingen, Rollen (`owner`, `admin`, `editor`, `viewer`) berücksichtigen. |
| **Reaktions-Tracking** | Likes, Reposts und Replies abrufen und historisieren. |
| **Dashboard-Anbindung** | APIs für Planung, Vorschau und Monitoring bereitstellen. |

---

## Eingaben

- Kampagnen- und Account-Daten (Tenant, Rollen, Status)
- Texte, Medien und Metadaten für Skeets/Threads
- Geplante Veröffentlichungszeitpunkte und Wiederholungsregeln
- Plattformkonfigurationen (z. B. Bluesky-Identifier, App-Passwörter)

## Ausgaben

- Erfolgreich veröffentlichte Posts inklusive Plattform-URI
- Fehlermeldungen und Logs bei abgebrochenen Versuchen
- Status- und Analysedaten für das Dashboard

---

## Interaktionen

- **Benutzer:innen:** Planen Kampagnen, bearbeiten Inhalte, prüfen Ergebnisse.
- **Backend-Datenbank:** Persistiert Kampagnen, Posts, Jobs, Reaktionen und Credentials.
- **Scheduler-Worker:** Führt geplante Jobs aus und meldet Status zurück.
- **Plattform-APIs:** Aktuell Bluesky (ATProto); Architektur ist auf weitere Netzwerke vorbereitet.
- **Dashboard:** Visualisiert Status, Auswertungen und bietet Eingabeformulare.

---

## Konfiguration & Betrieb

### Environment-Variablen (Auszug)

- `DATABASE_URL` – Datenbankverbindung (SQLite, PostgreSQL oder MySQL)
- `SESSION_SECRET` – Schlüssel für Sitzungs- und Tokenverschlüsselung
- `BLUESKY_IDENTIFIER` / `BLUESKY_APP_PASSWORD` – Plattformzugang
- `PORT` – API- bzw. Dashboard-Port
- `NODE_ENV` – Laufzeitumgebung (`development`, `production`)

### Migrationen & Versionierung

- Sequelize-Migrationen für Kampagnen, Skeets/Threads, Plattformkonten, Credentials und Reaktionen
- Versionierte Seeds und Tests für Kern-Workflows

### Frontend-Komponenten

- React-basierte Formulare (z. B. `SkeetForm`, `ThreadComposer`, `CampaignDashboard`)
- Konsistente Statusfarben und Zeitachsen basierend auf den Diagrammdefinitionen

---

## Beispielablauf

1. Benutzer:in erstellt eine Kampagne im Dashboard und plant Skeets oder Threads.
2. Der Agent speichert Inhalte, verschlüsselt Zugangsdaten und legt Scheduler-Jobs an.
3. Zum geplanten Zeitpunkt löst der Scheduler den Job aus; der Agent veröffentlicht den Post.
4. Rückmeldungen der Bluesky-API werden verarbeitet, Status aktualisiert und Logs erstellt.
5. Dashboard und Analysen zeigen den finalen Zustand und Reaktionswerte an.
