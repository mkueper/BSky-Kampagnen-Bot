/**
 * Testgruppe: test-config.test.js
 *
 * Diese Tests prüfen:
 * - dass die Vitest-Konfiguration die erwarteten Test-Suiten (Backend, bsky-client, Dashboard)
 *   per Include-Pattern erfasst
 * - dass das meta-Skript scripts/test-all.mjs alle Workspaces berücksichtigt
 *
 * Kontext:
 * Meta-/CI-Tests für die selektive Ausführung von Test-Suites (siehe usefull-tests.md, Abschnitt 12).
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('scripts/test-all.mjs – Workspace-Auswahl', () => {
  it('führt Tests für Root, Dashboard, bsky-client und Shared-UI aus', () => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'test-all.mjs')
    const content = fs.readFileSync(scriptPath, 'utf8')

    expect(content).toContain(`{ name: 'root', args: ['npm', ['run', 'test']] }`)
    expect(content).toContain(`{ name: 'dashboard', args: ['npm', ['run', 'test', '--workspace', 'dashboard']] }`)
    expect(content).toContain(`{ name: 'bsky-client', args: ['npm', ['run', 'test', '--workspace', 'bsky-client']] }`)
    expect(content).toContain(`{ name: 'packages/shared-ui', args: ['npm', ['run', 'test', '--workspace', 'packages/shared-ui']] }`)
  })
})
