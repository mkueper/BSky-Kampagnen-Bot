#!/usr/bin/env node
/*
 * Append a bullet to the "## Unreleased" section of CHANGELOG.md
 * Usage:
 *   npm run changelog:add -- "Dein Eintrag hier"
 */
const fs = require('fs');
const path = require('path');

const ENTRY = (process.argv.slice(2).join(' ') || '').trim();
if (!ENTRY) {
  console.error('Bitte einen Eintragstext angeben. Beispiel:');
  console.error('  npm run changelog:add -- "UI: Sortier-Icons für veröffentlichte Skeets"');
  process.exit(1);
}

const file = path.join(process.cwd(), 'CHANGELOG.md');
if (!fs.existsSync(file)) {
  console.error('CHANGELOG.md nicht gefunden.');
  process.exit(2);
}

const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
const header = '## Unreleased';
const hIdx = lines.findIndex((l) => l.trim() === header);
if (hIdx === -1) {
  console.error('Abschnitt "## Unreleased" nicht gefunden. Bitte manuell ergänzen.');
  process.exit(3);
}

// Finde die nächste Abschnitts-Überschrift (Beginn einer Zeile mit "## ")
let nextHeaderIdx = lines.slice(hIdx + 1).findIndex((l) => /^##\s+/.test(l));
if (nextHeaderIdx !== -1) {
  nextHeaderIdx = nextHeaderIdx + hIdx + 1;
} else {
  nextHeaderIdx = lines.length;
}

// Eintrag direkt vor dem nächsten Header (oder am Datei-Ende) einfügen
const bullet = `- ${ENTRY}`;
lines.splice(nextHeaderIdx, 0, bullet);

fs.writeFileSync(file, lines.join('\n'));
console.log('CHANGELOG aktualisiert:');
console.log('  ', bullet);

