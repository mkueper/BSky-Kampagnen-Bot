import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

/**
 * Testgruppe: migrationsSmoke.test.js
 *
 * Diese Tests überprüfen:
 * - dass die Sequelize-Migrationen gegen eine Test-Datenbank durchlaufen
 * - dass das Seeder-Kommando mit einem leeren Seeders-Ordner lauffähig ist
 *
 * Kontext:
 * Smoke-Tests, um Schema-Änderungen frühzeitig auf Migration/Seeder-Ebene
 * zu validieren, ohne Anwendungslogik zu testen.
 */

function getSequelizeBin () {
  const binName = process.platform === 'win32' ? 'sequelize.cmd' : 'sequelize'
  return path.join(process.cwd(), 'node_modules', '.bin', binName)
}

function runSequelize (args, options = {}) {
  const bin = getSequelizeBin()
  const result = spawnSync(bin, args, {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
    ...options
  })
  return result
}

describe('Sequelize Migrations & Seeds (Smoke-Tests)', () => {
  it('führt db:migrate im Test-Environment erfolgreich aus', () => {
    const result = runSequelize(['db:migrate', '--env', 'test', '--config', 'config/config.js'])

    if (result.status !== 0) {
      // Bei Fehlern die Ausgabe im Assertion-Fehler anzeigen
      throw new Error(
        `db:migrate failed (exit ${result.status})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      )
    }

    expect(result.status).toBe(0)
  })

  it('führt db:seed:all mit leerem Seeders-Ordner ohne Fehler aus', () => {
    const seedersDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sequelize-seeders-'))

    const result = runSequelize([
      'db:seed:all',
      '--env',
      'test',
      '--config',
      'config/config.js',
      '--seeders-path',
      seedersDir
    ])

    if (result.status !== 0) {
      throw new Error(
        `db:seed:all failed (exit ${result.status})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      )
    }

    expect(result.status).toBe(0)
  })
})

