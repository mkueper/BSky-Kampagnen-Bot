# Systemarchitektur

Das Diagramm vermittelt einen schnellen Überblick über die Kernkomponenten des Systems und deren Interaktionen.

```mermaid
flowchart TD
  subgraph Backend
    BE["Express API"]
    SCH["Scheduler & Worker"]
    SSE["SSE / Presence Service"]
  end

  FE["Web-Frontend (React/Vite)"]
  DB["SQLite (data/bluesky_campaign_<env>.sqlite)"]
  BSKY["Bluesky API (ATProto)"]
  MASTO["Mastodon API (optional)"]
  TENOR["Tenor GIF Proxy (optional)"]

  FE -- REST --> BE
  FE -- SSE --> SSE
  SSE -- Push Events --> FE
  BE <--> DB
  BE <--> SCH
  SCH --> BSKY
  BE --> BSKY
  BE --> MASTO
  BE --> TENOR
```

> Für produktive Setups empfiehlt sich zusätzlich ein Reverse Proxy (z. B. Traefik oder Nginx) vor Backend und Frontend.
