const { env } = require('@env')

function getBlueskyCredentials () {
  const serverUrl = (env?.bluesky?.serverUrl || 'https://bsky.social').trim()
  const identifier = (env?.bluesky?.identifier || '').trim()
  return {
    serverUrl,
    handle: identifier,
    identifier
  }
}

module.exports = {
  getBlueskyCredentials
}
