# scripts/ – Hilfsskripte für den BSKY‑Kampagnen‑Bot

Dieses Verzeichnis enthält **manuell ausführbare** Hilfsskripte (z. B. Smoke‑Tests, One‑Off‑Tasks, Migrations‑Helper).  
Sie sind **nicht** Teil des Produktions‑Builds.

---

## Voraussetzungen

- Node.js ≥ 20
- Abhängigkeiten installiert: `npm i`
- TypeScript + ts-node verfügbar:
  ```bash
  npm i -D typescript ts-node
  ```
---

## Struktur

```bash
scripts/
├─ smokeBlueskyPost.ts   # Minimaler End‑to‑End‑Test zum Posten auf Bluesky
└─ README.md             # Diese Datei
```
Benennung: themaAktion.ts (z. B. dbMigrateOnce.ts, mastodonSmoke.ts).

## Schnellstart
Bluesky Smoke‑Test ausführen

Postet einen kurzen Test‑Skeet über das Plattform‑Profil „bluesky“.

```bash
npx ts-node scripts/smokeBlueskyPost.ts
```

Oder als NPM‑Script (Empfehlung – in package.json):
```json
"scripts": {
  "smoke": "ts-node scripts/smokeBlueskyPost.ts"
}
```
```bash
npm run smoke
```