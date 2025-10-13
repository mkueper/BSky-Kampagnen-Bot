import 'module-alias/register'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// eslint-disable-next-line import/no-commonjs
const creds = require('@api/controllers/credentialsController')

const TMP_DIR = path.join(process.cwd(), 'tests', '.tmp_env')
const ENV_FILE = path.join(TMP_DIR, 'test.env')

describe('credentialsController', () => {
  const prevEnv = { ...process.env }
  beforeEach(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true })
    try { fs.unlinkSync(ENV_FILE) } catch {}
    process.env = { ...prevEnv, ENV_PATH: ENV_FILE }
    delete process.env.BLUESKY_SERVER_URL
    delete process.env.BLUESKY_IDENTIFIER
    delete process.env.BLUESKY_APP_PASSWORD
    delete process.env.MASTODON_API_URL
    delete process.env.MASTODON_ACCESS_TOKEN
  })
  afterEach(() => {
    process.env = { ...prevEnv }
    try { fs.unlinkSync(ENV_FILE) } catch {}
  })

  it('getCredentials returns flags according to process.env', async () => {
    let payload = null
    const res = { json: (o) => { payload = o }, status: () => ({ json: (o) => { payload = o } }) }
    await creds.getCredentials({}, res)
    expect(payload?.bluesky?.hasAppPassword).toBe(false)
  })

  it('updateCredentials writes ENV file and updates process.env', async () => {
    const body = {
      blueskyServerUrl: 'https://bsky.social',
      blueskyIdentifier: 'user@example',
      blueskyAppPassword: 'apppass',
      mastodonApiUrl: 'https://mastodon.social',
      mastodonAccessToken: 'token'
    }
    const req = { body }
    let payload = null
    const res = { json: (o) => { payload = o }, status: () => ({ json: (o) => { payload = o } }) }
    await creds.updateCredentials(req, res)
    expect(payload?.ok).toBe(true)
    // runtime env updated
    expect(process.env.BLUESKY_IDENTIFIER).toBe('user@example')
    // env file persisted
    const text = fs.readFileSync(ENV_FILE, 'utf8')
    expect(text).toMatch(/BLUESKY_IDENTIFIER=user@example/)
    expect(text).toMatch(/MASTODON_API_URL=https:\/\/mastodon\.social/)
  })
})
