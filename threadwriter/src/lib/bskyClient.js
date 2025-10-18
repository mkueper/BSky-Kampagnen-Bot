import { BskyAgent } from '@atproto/api'

export class BlueskyClient {
  constructor(service = 'https://bsky.social') {
    this.agent = new BskyAgent({ service })
    this.session = null
  }

  async login(identifier, appPassword) {
    if (!identifier || !appPassword) throw new Error('Identifier und App‑Passwort erforderlich.')
    this.session = await this.agent.login({ identifier, password: appPassword })
    return this.session
  }

  async postThread(texts) {
    if (!Array.isArray(texts) || texts.length === 0) throw new Error('Keine Segmente')
    const created = []
    let root = null
    let parent = null
    for (let i = 0; i < texts.length; i++) {
      const post = await this.agent.post({
        text: texts[i],
        reply: root && parent ? { root, parent } : undefined,
      })
      const ref = { uri: post.uri, cid: post.cid }
      if (!root) root = ref
      parent = ref
      created.push(ref)
    }
    return created
  }
}
