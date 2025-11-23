import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

function freshLogging () {
  // purge require cache to re-evaluate env
  const key = require.resolve('@utils/logging')
  delete require.cache[key]
  return require('@utils/logging')
}

describe('logging config', () => {
  const orig = { ...process.env }
  beforeEach(() => { process.env = { ...orig } })

  it('respects LOG_LEVEL and ENGAGEMENT_DEBUG', () => {
    process.env.LOG_LEVEL = 'info'
    process.env.ENGAGEMENT_DEBUG = 'true'
    const { createLogger } = freshLogging()
    const log = createLogger('t')
    // should not throw on calls; debug allowed via ENGAGEMENT_DEBUG
    expect(() => log.debug('x')).not.toThrow()
    expect(() => log.info('y')).not.toThrow()
  })

  it('falls back to console target when file append fails', () => {
    process.env.LOG_TARGET = 'file'
    process.env.LOG_FILE = '/root/does-not-exist/log.txt'
    const { createLogger } = freshLogging()
    const log = createLogger('t')
    expect(() => log.info('fallback')).not.toThrow()
  })

  it('respects legacy logfile target alias', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logging-test-'))
    try {
      const tmpFile = path.join(tmpDir, 'alias.log')
      process.env.LOG_LEVEL = 'info'
      process.env.LOG_TARGET = 'logfile'
      process.env.LOG_FILE = tmpFile
      const { createLogger } = freshLogging()
      const log = createLogger('alias')
      log.info('alias works')
      const content = fs.readFileSync(tmpFile, 'utf8')
      expect(content).toContain('alias works')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('rotates file when LOG_MAX_BYTES exceeded', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logging-rotate-'))
    try {
      const logPath = path.join(tmpDir, 'rotate.log')
      process.env.LOG_LEVEL = 'info'
      process.env.LOG_TARGET = 'file'
      process.env.LOG_FILE = logPath
      process.env.LOG_MAX_BYTES = '128'
      process.env.LOG_MAX_BACKUPS = '2'
      const { createLogger } = freshLogging()
      const log = createLogger('rotate')
      const payload = 'x'.repeat(400)
      log.info(`first-${payload}`)
      log.info(`second-${payload}`)
      const rotatedFile = `${logPath}.1`
      expect(fs.existsSync(rotatedFile)).toBe(true)
      const rotatedContent = fs.readFileSync(rotatedFile, 'utf8')
      expect(rotatedContent).toContain('first-')
      const currentContent = fs.readFileSync(logPath, 'utf8')
      expect(currentContent).toContain('second-')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
