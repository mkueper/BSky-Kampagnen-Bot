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

Hinweis zu Icons:
- AppImage-Icon kommt aus `build/icon.png` (electron-builder config).
- Fenster-Icon (KDE/Plasma) nutzt `bsky-client/dist/favicon.png`.

Für lokale Tests kannst du statt des Build-Skripts eine Dev-Session starten:

```bash
npm run dev:bsky-client
wait-on http://localhost:5173
VITE_DEV_SERVER_URL=http://localhost:5173 electron electron/main-bsky-client.js
```

Damit lädt Electron direkt den Dev-Server (mit eingeschalteter Sandbox).

## Sandbox-Verhalten unter Linux

- Die bisherige Komplett-App deaktiviert die Chromium-Sandbox, weil das Backend im selben Prozess läuft und AppImage-Umgebungen keine setuid-Helfer erlauben.
- Die Beta-App lädt ausschließlich den `bsky-client/dist` und startet standardmäßig mit `sandbox: true` für den Browser-Prozess.
- Auf Linux schaltet das Entry automatisch auf `--no-sandbox`/`disable-gpu-sandbox` um, wenn der ausgelieferte `chrome-sandbox`-Helper nicht root-owned + setuid ist (typisch bei AppImage-Mounts). Damit entfällt ein manueller `--no-sandbox`-Parameter in der Praxis.

## Troubleshooting (nur für Tests)

- `BSKY_FORCE_SANDBOX=1` / `BSKY_FORCE_NO_SANDBOX=1` überschreiben die automatische Sandbox-Erkennung (AppImage).
- `BSKY_DISABLE_DEV_SHM=true` erzwingt `--disable-dev-shm-usage`.
- `BSKY_USE_SYSTEM_TMP=true` nutzt wieder `/tmp` statt `~/.bsky-client-tmp`.
- `BSKY_ENABLE_DEV_SHM=true` hebt die AppImage-Default-Deaktivierung von `/dev/shm` auf.
- `BSKY_STARTUP_DEBUG=true` loggt Sandbox- und Temp-Entscheidungen beim Start.
- KDE/Plasma (Wayland): AppImage-Icons können fehlen. Testweise `--ozone-platform=x11` starten oder `kbuildsycoca5 --noincremental` ausführen.

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
