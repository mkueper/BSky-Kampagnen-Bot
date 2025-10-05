#!/usr/bin/env node
/*
 * Konsolidiert changelog-unreleased.md in CHANGELOG.md unter einer neuen Version.
 * Usage:
 *   npm run changelog:release -- 1.2.3
 */
const fs = require('fs');
const path = require('path');

const version = (process.argv[2] || '').trim();
if (!version) {
  console.error('Bitte Versionsnummer angeben. Beispiel:');
  console.error('  npm run changelog:release -- 1.2.3');
  process.exit(1);
}

const unreleasedPath = path.join(process.cwd(), 'changelog-unreleased.md');
const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
if (!fs.existsSync(unreleasedPath) || !fs.existsSync(changelogPath)) {
  console.error('Erforderliche Dateien fehlen (changelog-unreleased.md oder CHANGELOG.md).');
  process.exit(2);
}

const unreleased = fs.readFileSync(unreleasedPath, 'utf8').split(/\r?\n/);

// Parse unreleased into sections -> bullets (ignoriere Datum beim Mergen)
const sections = new Map();
let currentSection = null;
for (const line of unreleased) {
  const trimmed = line.trim();
  if (trimmed.startsWith('## ')) { // date header
    currentSection = null;
    continue;
  }
  if (trimmed.startsWith('### ')) {
    currentSection = trimmed.slice(4);
    if (!sections.has(currentSection)) sections.set(currentSection, []);
    continue;
  }
  if (trimmed.startsWith('- ')) {
    const sec = currentSection || 'Misc';
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec).push(trimmed);
  }
}

const entriesCount = Array.from(sections.values()).reduce((a, b) => a + b.length, 0);
if (entriesCount === 0) {
  console.error('Keine Unreleased-Einträge gefunden. Abbruch.');
  process.exit(3);
}

const today = new Date().toISOString().slice(0, 10);
const block = [];
block.push(`## v${version} - ${today}`);
block.push('');
for (const [sec, bullets] of sections) {
  block.push(`### ${sec}`);
  block.push(...bullets);
  block.push('');
}

// Insert into CHANGELOG.md direkt unter "## Unreleased"
const changelog = fs.readFileSync(changelogPath, 'utf8').split(/\r?\n/);
const hdr = '## Unreleased';
const idx = changelog.findIndex((l) => l.trim() === hdr);
if (idx === -1) {
  console.error('Abschnitt "## Unreleased" in CHANGELOG.md nicht gefunden.');
  process.exit(4);
}

changelog.splice(idx + 1, 0, '', ...block);
fs.writeFileSync(changelogPath, changelog.join('\n'));

// Reset unreleased file (Header behalten)
const reset = ['# Unreleased Notes', '', '#', '# (automatisch geleert nach Release)', ''];
fs.writeFileSync(unreleasedPath, reset.join('\n'));

console.log(`CHANGELOG.md aktualisiert mit v${version}.`);
console.log(`Unreleased-Notizen geleert.`);

