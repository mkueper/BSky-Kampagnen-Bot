const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky:actions')
const bsky = require('@core/services/blueskyClient')

async function like(req, res) {
  try {
    const uri = String(req.body?.uri || '').trim()
    const cid = String(req.body?.cid || '').trim()
    if (!uri || !cid) return res.status(400).json({ error: 'uri und cid erforderlich' })
    const likeUri = await bsky.likePost(uri, cid)
    let totals = null
    try {
      const r = await bsky.getReactions(uri)
      const likes = typeof r?.likesCount === 'number' ? r.likesCount : Array.isArray(r?.likes) ? r.likes.length : 0
      const reposts = typeof r?.repostsCount === 'number' ? r.repostsCount : Array.isArray(r?.reposts) ? r.reposts.length : 0
      totals = { likes, reposts }
    } catch (error) {
      log.warn('Reaktionen nach Like konnten nicht geladen werden', {
        uri,
        error: error?.message || String(error)
      })
    }
    res.json({ ok: true, viewer: { like: likeUri }, totals })
  } catch (e) {
    log.error('like failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Like fehlgeschlagen' })
  }
}

async function unlike(req, res) {
  try {
    const likeUri = String(req.body?.likeUri || req.query?.likeUri || '').trim()
    if (!likeUri) return res.status(400).json({ error: 'likeUri erforderlich' })
    await bsky.unlikePost(likeUri)
    res.json({ ok: true, viewer: { like: null } })
  } catch (e) {
    log.error('unlike failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Unlike fehlgeschlagen' })
  }
}

async function repost(req, res) {
  try {
    const uri = String(req.body?.uri || '').trim()
    const cid = String(req.body?.cid || '').trim()
    if (!uri || !cid) return res.status(400).json({ error: 'uri und cid erforderlich' })
    const repostUri = await bsky.repostPost(uri, cid)
    let totals = null
    try {
      const r = await bsky.getReactions(uri)
      const likes = typeof r?.likesCount === 'number' ? r.likesCount : Array.isArray(r?.likes) ? r.likes.length : 0
      const reposts = typeof r?.repostsCount === 'number' ? r.repostsCount : Array.isArray(r?.reposts) ? r.reposts.length : 0
      totals = { likes, reposts }
    } catch (error) {
      log.warn('Reaktionen nach Repost konnten nicht geladen werden', {
        uri,
        error: error?.message || String(error)
      })
    }
    res.json({ ok: true, viewer: { repost: repostUri }, totals })
  } catch (e) {
    log.error('repost failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Repost fehlgeschlagen' })
  }
}

async function unrepost(req, res) {
  try {
    const repostUri = String(req.body?.repostUri || req.query?.repostUri || '').trim()
    if (!repostUri) return res.status(400).json({ error: 'repostUri erforderlich' })
    await bsky.unrepostPost(repostUri)
    res.json({ ok: true, viewer: { repost: null } })
  } catch (e) {
    log.error('unrepost failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Undo-Repost fehlgeschlagen' })
  }
}

module.exports = { like, unlike, repost, unrepost }
