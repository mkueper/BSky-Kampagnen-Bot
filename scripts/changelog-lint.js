#!/usr/bin/env node
/**
 * Lintet die Struktur von changelog-unreleased.md.
 * Erwartet Blöcke im Format:
 *   ## YYYY-MM-DD
 *   ### <Sektion>
 *   - Eintrag
 *
 * Rückgabe-Code:
 *   0 = OK, 1 = Fehler
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'changelog-unreleased.md');
if (!fs.existsSync(filePath)) {
  console.error('changelog-unreleased.md nicht gefunden.');
  process.exit(2);
}

const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

const errors = [];
let currentDate = null;
let currentSection = null;
let inDate = false;
let inSection = false;

// Statistik
const dates = new Map(); // date => { sections: Map<section, bulletCount>, bulletCount }

const addError = (lineNo, message) => {
  errors.push({ line: lineNo, message });
};

for (let i = 0; i < lines.length; i++) {
  const lineNo = i + 1;
  const raw = lines[i];
  const t = raw.trim();

  if (t === '') continue; // Leerzeilen sind erlaubt

  // Kommentare (einfaches #) erlauben, außer echte ##/###-Überschriften
  if (t.startsWith('#') && !(t.startsWith('## ') || t.startsWith('### '))) {
    continue;
  }

  if (t.startsWith('## ')) {
    const dateStr = t.slice(3).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      addError(lineNo, `Ungültiges Datumsformat nach "##" (gefunden: "${dateStr}"). Erwartet: YYYY-MM-DD.`);
    }
    currentDate = dateStr;
    inDate = true;
    inSection = false;
    currentSection = null;
    if (!dates.has(currentDate)) {
      dates.set(currentDate, { bulletCount: 0, sections: new Map() });
    }
    continue;
  }

  if (t.startsWith('### ')) {
    if (!inDate || !currentDate) {
      addError(lineNo, 'Sektionsüberschrift (###) außerhalb eines Datumsblocks (##).');
    }
    currentSection = t.slice(4).trim();
    inSection = true;
    // Init Stats
    const d = dates.get(currentDate) || { bulletCount: 0, sections: new Map() };
    if (!d.sections.has(currentSection)) d.sections.set(currentSection, 0);
    dates.set(currentDate, d);
    continue;
  }

  if (t.startsWith('- ')) {
    if (!inSection || !currentSection || !inDate || !currentDate) {
      addError(lineNo, 'Bullet-Eintrag (- ) muss unterhalb einer Sektionsüberschrift (###) innerhalb eines Datumsblocks (##) stehen.');
    }
    // Stats hochzählen
    const d = dates.get(currentDate) || { bulletCount: 0, sections: new Map() };
    d.bulletCount++;
    d.sections.set(currentSection, (d.sections.get(currentSection) || 0) + 1);
    dates.set(currentDate, d);
    continue;
  }

  // Alles andere ist nicht erlaubt
  addError(lineNo, 'Unerwartete Zeile. Erlaubt sind: leere Zeilen, Kommentare (# ...), Datum (## YYYY-MM-DD), Sektion (### ...), Bullet (- ...).');
}

// Nachlaufende Validierungen
if (dates.size === 0) {
  addError(1, 'Kein Datumsblock gefunden. Füge einen Abschnitt "## YYYY-MM-DD" hinzu.');
}

for (const [dateKey, info] of dates.entries()) {
  if (info.bulletCount === 0) {
    errors.push({ line: 0, message: `Datumsblock ${dateKey} enthält keine Einträge (- ...).` });
  }
  for (const [section, count] of info.sections.entries()) {
    if (count === 0) {
      errors.push({ line: 0, message: `Sektion "${section}" in ${dateKey} enthält keine Einträge (- ...).` });
    }
  }
}

if (errors.length) {
  console.error('Changelog Lint: FEHLER');
  for (const e of errors) {
    const loc = e.line ? `Zeile ${e.line}: ` : '';
    console.error(`  ${loc}${e.message}`);
  }
  process.exit(1);
} else {
  // Erfolgsausgabe
  const dateCount = dates.size;
  const entryCount = Array.from(dates.values()).reduce((sum, d) => sum + d.bulletCount, 0);
  console.log(`Changelog Lint: OK (${dateCount} Datum/Datumsblöcke, ${entryCount} Einträge)`);
}

