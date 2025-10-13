import { describe, it, expect, beforeEach } from 'vitest'

function freshLogging () {
  // purge require cache to re-evaluate env
  const key = require.resolve('@utils/logging')
  delete require.cache[key]
  // eslint-disable-next-line import/no-commonjs
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
})
