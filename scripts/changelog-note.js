#!/usr/bin/env node
/*
 * Fügt einen Eintrag in changelog-unreleased.md hinzu.
 * Usage:
 *   npm run changelog:note -- --section="UI" "Eintragstext"
 * Section ist optional (Default: Misc)
 */
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  let section = 'Misc';
  const rest = [];
  for (const arg of argv) {
    if (arg.startsWith('--section=')) {
      section = arg.slice('--section='.length).trim() || section;
    } else if (arg !== '--') {
      rest.push(arg);
    }
  }
  const text = rest.join(' ').trim();
  return { section, text };
}

const { section, text } = parseArgs(process.argv.slice(2));
if (!text) {
  console.error('Bitte einen Eintragstext angeben. Beispiel:');
  console.error('  npm run changelog:note -- --section=UI "Sortier-Icons für veröffentlichte Skeets"');
  process.exit(1);
}

const file = path.join(process.cwd(), 'changelog-unreleased.md');
if (!fs.existsSync(file)) {
  console.error('changelog-unreleased.md nicht gefunden.');
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
let content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

function ensureDateSection(lines, date) {
  const dateHeader = `## ${date}`;
  let idx = lines.findIndex((l) => l.trim() === dateHeader);
  if (idx === -1) {
    // Append at end
    if (lines[lines.length - 1] !== '') lines.push('');
    lines.push(dateHeader, '');
    idx = lines.length - 2;
  }
  return idx;
}

function ensureSection(lines, startIdx, sectionName) {
  const secHeader = `### ${sectionName}`;
  // search until next date header or end
  let i = startIdx + 1;
  let insertPos = -1;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('## ')) break; // next date
    if (l.trim() === secHeader) return i;
    if (l.trim().length === 0) insertPos = i; // remember blank line to insert before
    i++;
  }
  // Not found: insert sec header at insertPos or at i
  const pos = insertPos !== -1 ? insertPos + 1 : i;
  lines.splice(pos, 0, secHeader, '');
  return pos;
}

const dateIdx = ensureDateSection(lines, today);
const secIdx = ensureSection(lines, dateIdx, section);

// find insertion point: after section header until next header
let j = secIdx + 1;
while (j < lines.length && !lines[j].startsWith('## ') && !lines[j].startsWith('### ')) j++;

lines.splice(j, 0, `- ${text}`);
fs.writeFileSync(file, lines.join('\n'));
console.log(`Unreleased-Note hinzugefügt: [${today}] (${section}) ${text}`);

