import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Testgruppe: switchEnv.test.js
 *
 * Diese Tests überprüfen:
 * - Kopieren von `.env.dev`/`.env.prod` nach `.env`
 * - Verhalten von `if-missing`
 * - Backup-Erstellung bei bestehender `.env`
 * - Fehlercodes bei fehlendem Source oder ungültigem Modus
 *
 * Kontext:
 * Script `scripts/switch-env.js` wird von npm-Skripten genutzt, um
 * das aktive `.env` für verschiedene Umgebungen zu setzen.
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../../..')
const SCRIPT_SOURCE = path.join(repoRoot, 'scripts', 'switch-env.js')

let tmpDir

function writeFile (relPath, content) {
  const full = path.join(tmpDir, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
}

function readFile (relPath) {
  return fs.readFileSync(path.join(tmpDir, relPath), 'utf8')
}

function runSwitchEnv (...args) {
  const scriptTarget = path.join(tmpDir, 'switch-env.js')
  if (!fs.existsSync(scriptTarget)) {
    fs.copyFileSync(SCRIPT_SOURCE, scriptTarget)
  }
  const result = spawnSync(process.execPath, [scriptTarget, ...args], {
    cwd: tmpDir,
    encoding: 'utf8'
  })
  return result
}

describe('scripts/switch-env.js', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'switch-env-test-'))
  })

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('kopiert .env.dev nach .env, wenn noch keine .env existiert', () => {
    writeFile('.env.dev', 'FOO=dev\nBAR=1\n')

    const result = runSwitchEnv('dev')

    expect(result.status).toBe(0)
    const envContent = readFile('.env')
    expect(envContent).toContain('FOO=dev')
    expect(envContent).toContain('BAR=1')
  })

  it('erstellt ein Backup, wenn eine bestehende .env überschrieben wird', () => {
    writeFile('.env.dev', 'MODE=dev\n')
    writeFile('.env', 'MODE=old\nOLD=1\n')

    const beforeFiles = new Set(fs.readdirSync(tmpDir))
    const result = runSwitchEnv('dev')
    const afterFiles = fs.readdirSync(tmpDir)

    expect(result.status).toBe(0)

    const envContent = readFile('.env')
    expect(envContent).toContain('MODE=dev')
    expect(envContent).not.toContain('MODE=old')

    const newFiles = afterFiles.filter((name) => !beforeFiles.has(name))
    const backupFiles = newFiles.filter((name) => name.startsWith('.env.') && name.endsWith('.bak'))
    expect(backupFiles.length).toBeGreaterThanOrEqual(1)

    const backupContent = readFile(backupFiles[0])
    expect(backupContent).toContain('MODE=old')
    expect(backupContent).toContain('OLD=1')
  })

  it('überspringt das Umschalten mit if-missing, wenn bereits eine .env existiert', () => {
    writeFile('.env.dev', 'FROM_DEV=1\n')
    writeFile('.env', 'EXISTING=1\n')

    const result = runSwitchEnv('dev', 'if-missing')

    expect(result.status).toBe(0)
    const envContent = readFile('.env')
    expect(envContent).toContain('EXISTING=1')
    expect(envContent).not.toContain('FROM_DEV=1')
  })

  it('gibt Exit-Code 2 zurück, wenn die Source-Datei fehlt', () => {
    // keine .env.dev schreiben
    const result = runSwitchEnv('dev')

    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/Source env file not found/i)
  })

  it('zeigt Usage und liefert einen Fehlercode bei ungültigem Modus', () => {
    const result = runSwitchEnv('staging')

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/Usage: node scripts\/switch-env\.js/i)
  })
})
