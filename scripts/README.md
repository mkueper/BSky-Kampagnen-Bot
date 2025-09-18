# scripts – Hilfswerkzeuge für den BSky-Kampagnen-Bot

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
├─ smokeBlueskyPost.ts    # Minimaler End-to-End-Test für Bluesky-Posts
├─ smokeMastodonPost.ts   # Experimenteller Smoke-Test für Mastodon (optional)
└─ README.md
```

Namenskonvention: `themaAktion.ts` (z. B. `dbMigrateOnce.ts`).

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
