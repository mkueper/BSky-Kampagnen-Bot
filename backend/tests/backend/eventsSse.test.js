import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'

const events = require('@core/services/events')

function createStubRes () {
  const writes = []
  return {
    writes,
    writeHead: () => {},
    write: (chunk) => { writes.push(String(chunk)) },
  }
}

describe('SSE events', () => {
  let req, res
  beforeEach(() => {
    req = new EventEmitter()
    res = createStubRes()
    events.sseHandler(req, res)
  })
  afterEach(() => {
    try { req.emit('close') } catch {}
  })

  it('sends event lines to connected clients', () => {
    events.emit('test:event', { ok: true })
    const text = res.writes.join('')
    expect(text).toContain('event: test:event')
    expect(text).toContain('data: {"ok":true}')
  })
})
