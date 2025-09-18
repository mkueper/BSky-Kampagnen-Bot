# Agent.md

## Name
Campaign Agent

## Rolle
Der Agent automatisiert die Veröffentlichung und Verwaltung von Kampagneninhalten auf sozialen Plattformen.  
Er stellt sicher, dass Beiträge zeitlich geplant, rechtssicher formuliert, in Threads strukturiert und nachverfolgt werden können.

## Aufgaben
- **Skeets posten**  
  Veröffentlichung einzelner Skeets auf Bluesky mit Unicode-Zeichenlimit (300 Zeichen).
- **Threads verwalten**  
  Erstellung, Planung und Verwaltung von mehrteiligen Beiträgen mit klarer Nummerierung.  
  Unterstützung für erzwungene Thread-Trennung.
- **Scheduler**  
  Zeitgenaue Planung und automatische Veröffentlichung von Posts (inkl. Zeitzonen-Handling).
- **Multi-Tenant Support**  
  Mehrere Kampagnen/Accounts parallel verwalten, getrennte Logins und Konfigurationen.
- **Reaktions-Tracking**  
  Erfassen von Likes, Reposts und Replies zur Auswertung der Kampagnenwirkung.
- **Dashboard**  
  Frontend-Komponenten für Verwaltung, Vorschau und Planung von Kampagnen (React-UI).
- **Plattform-Setup**  
  Abstraktion für verschiedene Plattformen (aktuell Bluesky, später Mastodon etc.).
- **Zeichenzähler**  
  Überprüfung von Beiträgen gegen die Plattformgrenzen (Unicode-Grapheme).
- **Migration & Versionierung**  
  Nutzung von Sequelize-Migrations für strukturierte Datenbankentwicklung.

## Eingaben
- Textinhalte für Skeets/Threads  
- Geplanter Veröffentlichungszeitpunkt  
- Account/Kampagnen-Zuordnung  
- Plattform-Konfiguration (API-Tokens, Secrets)  
- Optionale Metadaten (Alt-Text, Sharepics, Quellen)

## Ausgaben
- Veröffentlichung auf Zielplattform(en)  
- Logfiles der erfolgreichen oder fehlerhaften Veröffentlichungen  
- Tracking-Daten zu Reichweite und Reaktionen  
- Vorschau im Dashboard

## Interaktionen
- **User**: erstellt Kampagnen, plant Skeets/Threads, prüft Reaktionen.  
- **Datenbank**: persistiert Kampagnen, Posts, Threads, Scheduler-Jobs, Reaktionen.  
- **Plattform-APIs**: Bluesky (ATProto), künftig Mastodon und andere soziale Netzwerke.  
- **Dashboard**: UI zur Eingabe, Bearbeitung, Vorschau und Monitoring.

## Beispielablauf
1. User erstellt im Dashboard eine neue Kampagne.  
2. User fügt Skeets/Threads hinzu und plant Veröffentlichungszeitpunkte.  
3. Agent speichert die Daten in der Datenbank und legt Scheduler-Jobs an.  
4. Zum geplanten Zeitpunkt veröffentlicht der Agent die Inhalte auf der gewählten Plattform.  
5. Agent trackt Reaktionen (Likes, Reposts, Replies) und speichert diese zur Auswertung.  
6. Dashboard zeigt Statistiken und Kampagnenstatus an.

## Konfiguration
- **ENV Variablen**
  - `DATABASE_URL` – Verbindung zur SQLite/Postgres DB  
  - `SESSION_SECRET` – Verschlüsselung von Tokens  
  - `BLUESKY_IDENTIFIER` / `BLUESKY_PASSWORD` – API-Zugangsdaten  
  - `PORT` – Serverport für Dashboard  
  - `NODE_ENV` – Umgebung (development/production)

- **Migrationen**
  - Skeet & Thread Models  
  - Kampagnen Model  
  - Plattform Model  
  - Reaction Model

- **Frontend**
  - React mit Tailwind, shadcn/ui, lucide-icons  
  - Komponenten: SkeetForm, ThreadView, CampaignDashboard
