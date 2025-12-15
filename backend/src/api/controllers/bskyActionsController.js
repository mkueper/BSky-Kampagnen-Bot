const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky:actions')
const bsky = require('@core/services/blueskyClient')

function createActionHandler(
  bskyMethod,
  requiredBodyParams,
  actionName,
  errorMessage
) {
  return async (req, res) => {
    try {
      const params = {}
      for (const param of requiredBodyParams) {
        const value = String(req.body?.[param] || req.query?.[param] || '').trim()
        if (!value) {
          return res.status(400).json({ error: `${param} erforderlich` })
        }
        params[param] = value
      }

      // Handle optional postUri for unlike/unrepost
      if (req.body?.postUri || req.query?.postUri) {
        params.postUri = String(req.body?.postUri || req.query?.postUri || '').trim()
      }

      // Argumente in der korrekten Reihenfolge zusammenstellen
      const args = requiredBodyParams.map(p => params[p])
      if (params.postUri) {
        // Füge postUri als zweites Argument für unlike/unrepost hinzu
        args.splice(1, 0, params.postUri)
      }

      const data = await bsky[bskyMethod](...args)
      res.json({ ok: true, ...data })
    } catch (e) {
      log.error(`${actionName} failed`, { error: e?.message || String(e) })
      res.status(500).json({ error: e?.message || errorMessage })
    }
  }
}

const like = createActionHandler('likePost', ['uri', 'cid'], 'like', 'Like fehlgeschlagen')
const repost = createActionHandler('repostPost', ['uri', 'cid'], 'repost', 'Repost fehlgeschlagen')
const unlike = createActionHandler('unlikePost', ['likeUri'], 'unlike', 'Unlike fehlgeschlagen')
const unrepost = createActionHandler('unrepostPost', ['repostUri'], 'unrepost', 'Undo-Repost fehlgeschlagen')
const bookmark = createActionHandler('bookmarkPost', ['uri', 'cid'], 'bookmark', 'Bookmark fehlgeschlagen')
const unbookmark = createActionHandler('unbookmarkPost', ['uri'], 'unbookmark', 'Bookmark entfernen fehlgeschlagen')
const mute = createActionHandler('muteActor', ['did'], 'mute', 'Stummschalten fehlgeschlagen')
const unmute = createActionHandler('unmuteActor', ['did'], 'unmute', 'Stummschaltung aufheben fehlgeschlagen')
const block = createActionHandler('blockActor', ['did'], 'block', 'Blockieren fehlgeschlagen')
const unblock = createActionHandler('unblockActor', ['did'], 'unblock', 'Blockierung aufheben fehlgeschlagen')

module.exports = {
  like,
  unlike,
  repost,
  unrepost,
  bookmark,
  unbookmark
  , mute
  , unmute
  , block
  , unblock
}
