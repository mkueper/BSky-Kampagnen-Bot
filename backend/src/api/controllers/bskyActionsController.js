const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky:actions')
const bsky = require('@core/services/blueskyClient')

async function like(req, res) {
  try {
    const uri = String(req.body?.uri || '').trim()
    const cid = String(req.body?.cid || '').trim()
    if (!uri || !cid) return res.status(400).json({ error: 'uri und cid erforderlich' })
    const data = await bsky.likePost(uri, cid)
    res.json({ ok: true, ...data })
  } catch (e) {
    log.error('like failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Like fehlgeschlagen' })
  }
}

async function unlike(req, res) {
  try {
    const likeUri = String(req.body?.likeUri || req.query?.likeUri || '').trim()
    if (!likeUri) return res.status(400).json({ error: 'likeUri erforderlich' })
    const postUri = String(req.body?.postUri || req.query?.postUri || '').trim()
    const data = await bsky.unlikePost(likeUri, postUri)
    res.json({ ok: true, ...data })
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
    const data = await bsky.repostPost(uri, cid)
    res.json({ ok: true, ...data })
  } catch (e) {
    log.error('repost failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Repost fehlgeschlagen' })
  }
}

async function unrepost(req, res) {
  try {
    const repostUri = String(req.body?.repostUri || req.query?.repostUri || '').trim()
    if (!repostUri) return res.status(400).json({ error: 'repostUri erforderlich' })
    const postUri = String(req.body?.postUri || req.query?.postUri || '').trim()
    const data = await bsky.unrepostPost(repostUri, postUri)
    res.json({ ok: true, ...data })
  } catch (e) {
    log.error('unrepost failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Undo-Repost fehlgeschlagen' })
  }
}

module.exports = { like, unlike, repost, unrepost }
