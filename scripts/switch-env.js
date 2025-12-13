#!/usr/bin/env node
/*
 * Switches the active .env by copying from .env.dev or .env.prod
 * Usage: node scripts/switch-env.js dev|prod
 */
const fs = require('fs');
const path = require('path');

function writeStderr(message) {
  try {
    fs.writeSync(2, `${message}\n`);
  } catch {
    // Fallback for environments where fd 2 isn't writable.
    try {
      process.stderr.write(`${message}\n`);
    } catch {
      /* noop */
    }
  }
}

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backupIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${targetPath}.${stamp}.bak`;
  fs.copyFileSync(targetPath, backupPath);
  return backupPath;
}

function main() {
  const mode = (process.argv[2] || '').toLowerCase();
  const flag = (process.argv[3] || '').toLowerCase();
  if (!['dev', 'prod'].includes(mode)) {
    writeStderr('Usage: node scripts/switch-env.js <dev|prod> [if-missing]');
    // Avoid process.exit() so stderr can flush in non-TTY environments (e.g. tests).
    process.exitCode = 1;
    return;
  }

  const repoRoot = process.cwd();
  const source = path.join(repoRoot, `.env.${mode}`);
  const target = path.join(repoRoot, '.env');

  if (!fs.existsSync(source)) {
    writeStderr(`Source env file not found: ${path.relative(repoRoot, source)}`);
    // Avoid process.exit() so stderr can flush in non-TTY environments (e.g. tests).
    process.exitCode = 2;
    return;
  }

  // Optional: nur umschalten, wenn keine .env existiert
  if (flag === 'if-missing' && fs.existsSync(target)) {
    console.log('.env exists – skipping switch (if-missing).');
    return;
  }

  ensureDir(target);
  const backup = backupIfExists(target);
  fs.copyFileSync(source, target);

  console.log(`.env switched to ${path.basename(source)} ✅`);
  if (backup) {
    console.log(`Previous .env backed up to ${path.basename(backup)}`);
  }
}

main();
