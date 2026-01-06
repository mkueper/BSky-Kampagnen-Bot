# Deployment: BSky Client (Container)

## Ziel

Der Bluesky-Client wird fuer Produktion als statische SPA ueber Nginx ausgeliefert.
Ein separater Preview-Proxy kann optional als eigener Container laufen.

## Docker Compose

- `bsky-client`: Nginx liefert `bsky-client/dist` aus.
- `link-preview-proxy`: Optionaler Proxy fuer Link-Metadaten.

Die Ports sind ueber `.env` konfigurierbar:
- `BSKY_CLIENT_PORT` (Default: 5173)
- `PREVIEW_PROXY_PORT` (Default: 3456)

## Volumes (Update-sicher)

- `bsky-client-config`: Nginx-Konfiguration (wird im Container erzeugt und bleibt erhalten).
- `bsky-client-data`: optionale Client-Daten (z. B. statische Dateien/Overrides).
- `preview-proxy-data`: reserviert fuer Preview-Proxy-Daten.

## Preview-Proxy

Der Client nutzt im Container standardmaessig `/preview` als Endpoint.
Nginx leitet `/preview` an den Preview-Proxy weiter (same-origin, kein CORS).

