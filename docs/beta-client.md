# Bluesky Client – Beta Builds (Linux & Windows)

Dieser Leitfaden beschreibt, wie du den Bluesky-Client ohne Backend/Dashboard als eigenständige Desktop-App paketierst und warum unter Linux kein `--no-sandbox`-Flag mehr erforderlich ist.

## Voraussetzungen

- Node.js + npm installiert und alle Workspaces mit `npm install` eingerichtet.
- Der `bsky-client` ist mit `npm run build:bsky-client` buildbar (Vite produziert `bsky-client/dist`).
- `electron-builder` wird automatisch über die Dev-Dependencies ausgeführt.

## Build-Skripte

| Ziel | Befehl | Artefakt |
| --- | --- | --- |
| Linux (AppImage, x64/arm64) | `npm run build:electron:client:linux` | `dist/BSky Client Beta-*.AppImage` |
| Windows (NSIS, x64) | `npm run build:electron:client:win` | `dist/BSky Client Beta Setup *.exe` |

Die Skripte erledigen automatisch:

1. `bsky-client` bauen (`npm run build:bsky-client`).
2. Den Slim-Electron-Entry `electron/main-bsky-client.js` verwenden (only-Client, kein Backend).
3. Nur die benötigten Dateien verpacken (`electron/**`, `bsky-client/dist/**`, `package.json`).

Für lokale Tests kannst du statt des Build-Skripts eine Dev-Session starten:

```bash
npm run dev:bsky-client
wait-on http://localhost:5173
VITE_DEV_SERVER_URL=http://localhost:5173 electron electron/main-bsky-client.js
```

Damit lädt Electron direkt den Dev-Server (mit eingeschalteter Sandbox).

## Sandbox-Verhalten unter Linux

- Die bisherige Komplett-App deaktiviert die Chromium-Sandbox, weil das Backend im selben Prozess läuft und AppImage-Umgebungen keine setuid-Helfer erlauben.
- Die Beta-App lädt ausschließlich den `bsky-client/dist`, nutzt `sandbox: true` für den Browser-Prozess und verzichtet komplett auf `no-sandbox`/`disable-gpu-sandbox`.
- Dadurch ist kein `--no-sandbox`-Parameter mehr nötig – auch nicht auf AppImage-basierten Distributionen.
- Falls Electron feststellt, dass der ausgelieferte `chrome-sandbox`-Helper nicht setuid/root-besessen ist (typischer Fall bei AppImage-Mounts), schaltet das Entry automatisch auf `--no-sandbox` um. Damit entfällt der manuelle Parameter; wer das Verhalten überschreiben will, kann `BSKY_FORCE_SANDBOX=1` bzw. `BSKY_FORCE_NO_SANDBOX=1` setzen.

## Unterschiede zur Vollversion

- Kein Backend oder Dashboard im Bundle – ideal für Nutzer, die nur den Bluesky-Client testen möchten.
- Eigenes App-ID/ProductName (`BSky Client Beta`), damit Installation/Auto-Updates unabhängig von der Kampagnen-App bleiben.
- Die Datenbank-/Upload-Verzeichnisse des Kampagnen-Tools werden nicht angelegt; Einstellungen liegen ausschließlich in den OS-üblichen Electron-Pfaden (`app.getPath('userData')`).

## Smoke-Checkliste

- App starten → Login-Flow lädt (kein weißer Bildschirm).
- Externe Links öffnen im System-Browser (Menü -> `Cmd/Ctrl+K` etc.).
- Kontextmenüs erscheinen nur in editierbaren Bereichen.
- Unter Linux läuft die App ohne zusätzliche Flags (`chmod +x` → `./BSky Client Beta-*.AppImage`).

Wenn eines der Kriterien nicht erfüllt ist, bitte eine neue Beta-Version nicht veröffentlichen, sondern zuerst das Problem fixen.
