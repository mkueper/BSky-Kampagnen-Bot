# Bluesky Kampagnen-Tool

Ein Open-Source-Tool für die automatische, geplante Veröffentlichung und Überwachung von Bluesky-Posts (Skeets). Entwickelt mit Node.js (Express), React (Vite), Sequelize/SQLite und moderner API-Architektur.

---

## Funktionsumfang

- Geplante Veröffentlichung von Skeets zu beliebigen Zeitpunkten
- Verwaltung, Bearbeitung und Löschung geplanter Skeets im Web-Dashboard
- Automatischer Versand über die Bluesky-API (mit Login)
- Übersicht aller geplanten und bereits veröffentlichten Skeets
- Erfassung und Anzeige von Reaktionen (Likes, Reposts) und Replies
- Konfigurierbare Scheduler-Zeit über `.env`/`config.js`
- Einfache Installation und lokale Ausführung (auch im Docker möglich)

---

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/dein-benutzername/bluesky-kampagnen-tool.git
cd bluesky-kampagnen-tool
