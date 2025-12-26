# scripts – Hilfswerkzeuge für den BSky-Kampagnen-Tool

Das Verzeichnis enthält manuell ausführbare TypeScript-Skripte für Smoke-Tests und Wartungsaufgaben. Sie sind nicht Teil des regulären Builds, können aber bei Entwicklung, Fehleranalyse oder Integrationen unterstützen.

---

## Voraussetzungen

- Node.js ≥ 20
- Projektabhängigkeiten installiert (`npm install`)
- TypeScript/TSX-Laufzeit (wird automatisch über `devDependencies` bereitgestellt)

> Empfehlung: Skripte via `npx tsx` oder über die hinterlegten npm-Skripte starten.

---

## Struktur

```
scripts/
├─ checkEnvUsage.ts       # Prüft, ob Variablen aus .env im Code verwendet werden
├─ docker-bundle.sh       # Erstellt ein Deploy-Zip (inkl. SQLite, Dockerfiles)
├─ smokeBlueskyPost.ts    # Minimaler End-to-End-Test für Bluesky-Posts
├─ smokeMastodonPost.ts   # Experimenteller Smoke-Test für Mastodon (optional)
├─ dev-link-preview.js    # Lokaler Link-Vorschau-Proxy für den Bluesky-Client (Standalone-Entwicklung)
└─ README.md
```

Namenskonvention: `themaAktion.ts` (z. B. `dbMigrateOnce.ts`). Shell-Skripte beginnen mit dem Ziel (z. B. `docker-bundle.sh`).

---

## Ausführen von Skripten

### Bluesky-Smoke-Test

```bash
npm run smoke:bsky
# alternativ
npx tsx scripts/smokeBlueskyPost.ts
```

### Mastodon-Smoke-Test

```bash
npm run smoke:masto
# alternativ
npx tsx scripts/smokeMastodonPost.ts
```

### Environment-Check

```bash
npx tsx scripts/checkEnvUsage.ts
```

Die Skripte greifen auf `.env` zu. Verwende für Tests separate Zugangsdaten oder eine abgesicherte Test-Instanz.

### Docker-Bundle erstellen

```bash
npm run docker:bundle
# optional mit Namen/Praefix
npm run docker:bundle -- mein-bundle mein-prefix
```

Das Skript legt unter `dist/bundles/` ein Zip mit vollständigem Projekt (ohne `node_modules`) und aktueller SQLite-Datenbank an. Auf dem Zielsystem entpacken, in `app/` wechseln und `docker compose build && docker compose up -d` ausführen.

---

## Changelog-Linter

- Befehl: `npm run changelog:lint`
- Zweck: Validiert die Struktur von `changelog-unreleased.md` nach dem Schema
  `## YYYY-MM-DD` → `### <Sektion>` → `- Eintrag`. Leere Zeilen und einfache Kommentarzeilen (`# ...`) sind erlaubt.
- Fehlerfälle: Ungültiges Datum, Sektion außerhalb eines Datumsblocks, Bullet außerhalb einer Sektion, unerwartete Freitextzeilen, leere Blöcke.

### Optionaler Git-Hook (pre-commit)

Du kannst den Linter als Pre-Commit-Hook aktivieren, damit fehlerhafte Einträge Commits blockieren:

```bash
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Hinweise:
- Der Hook ist ein Template in `scripts/git-hooks/pre-commit` und wird nicht automatisch installiert.
- In CI kann `npm run changelog:lint` direkt als Schritt ausgeführt werden.
### Link-Preview-Proxy (lokal)

```bash
npm run dev:preview-proxy
# oder
node scripts/dev-link-preview.js
```

Der Proxy lauscht standardmäßig auf `http://127.0.0.1:3456/preview`. Kombiniere ihn mit `VITE_PREVIEW_PROXY_URL=http://127.0.0.1:3456/preview`, damit der Bluesky-Client auch ohne Backend echte Link-Vorschauen rendern kann. Port/Host lassen sich über `PREVIEW_PROXY_PORT` bzw. `PREVIEW_PROXY_HOST` überschreiben.

#### Docker-Variante

Unter `docker/link-preview-proxy.Dockerfile` kannst du ein schlankes Container-Image bauen:

```bash
docker build -f docker/link-preview-proxy.Dockerfile -t bsky-preview-proxy .
docker run --rm -p 3456:3456 bsky-preview-proxy
```

Env-Variablen wie `PREVIEW_PROXY_HOST`, `PREVIEW_PROXY_PORT` oder `PREVIEW_PROXY_PATH` können via `docker run -e …` gesetzt werden.
