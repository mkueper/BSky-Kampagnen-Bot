#!/usr/bin/env node
// scripts/db-reset.js
// Löscht die DB-Datei für die aktuelle NODE_ENV, damit Migrationen frisch aufbauen können.

const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const dbConfig = require(path.join(__dirname, '..', 'config', 'config.js'));
const cfg = dbConfig[env] || {};

if (!cfg.storage) {
  console.error(`[db-reset] Keine storage-Datei für env=${env} gefunden.`);
  process.exit(2);
}

try {
  if (fs.existsSync(cfg.storage)) {
    fs.unlinkSync(cfg.storage);
    console.log(`[db-reset] Entfernt: ${cfg.storage}`);
  } else {
    console.log(`[db-reset] Datei nicht vorhanden (ok): ${cfg.storage}`);
  }
  process.exit(0);
} catch (err) {
  console.error(`[db-reset] Fehler beim Entfernen von ${cfg.storage}:`, err && err.message ? err.message : err);
  process.exit(1);
}

