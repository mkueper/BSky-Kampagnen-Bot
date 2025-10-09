#!/usr/bin/env node
// scripts/clean-sequelize-meta.js
// Entfernt alte Einträge aus SequelizeMeta, sodass nur die Baseline verbleibt.
// Optionales Wartungs-Tool, NICHT als Migration ausführen.

const path = require('path');
const sequelize = require(path.join(__dirname, '..', 'src', 'models', 'db.js'));

async function main() {
  const keep = '00000000000000-baseline-rebuild.js';
  try {
    // Prüfen, ob Tabelle existiert
    const [rows] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='SequelizeMeta'");
    const hasTable = Array.isArray(rows) && rows.length > 0;
    if (!hasTable) {
      console.log('[meta:clean] Keine Tabelle SequelizeMeta gefunden – nichts zu tun.');
      process.exit(0);
    }

    // Wie viele Einträge behalten/entfernen?
    const [all] = await sequelize.query("SELECT name FROM SequelizeMeta");
    const total = Array.isArray(all) ? all.length : 0;
    const toDelete = Array.isArray(all) ? all.filter((r) => r && r.name !== keep) : [];
    if (toDelete.length === 0) {
      console.log(`[meta:clean] Tabelle bereits sauber. (${total} Einträge, nur '${keep}')`);
      process.exit(0);
    }

    await sequelize.query("DELETE FROM SequelizeMeta WHERE name <> $keep", { bind: { keep } });
    console.log(`[meta:clean] Entfernt ${toDelete.length} Eintrag/Einträge. Verbleibend: '${keep}'.`);
    process.exit(0);
  } catch (err) {
    console.error('[meta:clean] Fehler:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();

