# Systemarchitektur

Das Diagramm vermittelt einen schnellen Überblick über die Kernkomponenten des Systems und deren Interaktionen.

```mermaid
flowchart TD
  FE["Web-Frontend (React)"]
  BE["Backend-API (Node/Express)"]
  DB["Datenbank (SQLite / PostgreSQL / MySQL)"]
  SCH["Scheduler / Job-Queue"]
  BSKY["Bluesky API (ATProto)"]

  FE --> BE
  BE <--> DB
  BE <--> SCH
  BE --> BSKY
  SCH --> BSKY
```

> Für produktive Setups empfiehlt sich zusätzlich ein Reverse Proxy (z. B. Traefik oder Nginx) vor Backend und Frontend.
