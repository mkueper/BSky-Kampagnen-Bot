import { BskyAgent } from '@atproto/api'

const DEFAULT_BSKY_SERVICE = 'https://bsky.social'

function normalizeString (value) {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function normalizeServiceUrl (value) {
  const raw = normalizeString(value) || DEFAULT_BSKY_SERVICE
  try {
    const url = new URL(raw)
    return url.toString()
  } catch {
    return DEFAULT_BSKY_SERVICE
  }
}

/**
 * Leichter Wrapper um BskyAgent für direkte Client-Nutzung (ohne Backend).
 *
 * Verantwortlichkeiten:
 * - Service-URL normalisieren
 * - Login mit App-Passwort
 * - Session-Resume (für „Angemeldet bleiben“)
 * - Zugriff auf die aktuelle Session
 *
 * Persistenz (Speichern/Laden von Session und Settings) liegt bewusst außerhalb
 * dieser Klasse und wird von der Desktop-Runtime übernommen.
 */
export class BskyAgentClient {
  /**
   * @param {{ serviceUrl?: string }} options
   */
  constructor ({ serviceUrl } = {}) {
    this.serviceUrl = normalizeServiceUrl(serviceUrl)
    this.agent = new BskyAgent({ service: this.serviceUrl })
  }

  /**
   * Führt einen Login mit Identifier + App-Passwort durch.
   * @param {{ identifier: string, appPassword: string }} params
   * @returns {Promise<import('@atproto/api').BskyAgent['session']>}
   */
  async login ({ identifier, appPassword }) {
    const normalizedIdentifier = normalizeString(identifier)
    const normalizedPassword = normalizeString(appPassword)
    if (!normalizedIdentifier || !normalizedPassword) {
      throw new Error('Identifier und App-Passwort sind erforderlich.')
    }
    await this.agent.login({ identifier: normalizedIdentifier, password: normalizedPassword })
    return this.agent.session
  }

  /**
   * Versucht, eine gespeicherte Session wieder zu verwenden.
   * @param {any} session
   * @returns {Promise<import('@atproto/api').BskyAgent['session']>}
   */
  async resumeSession (session) {
    if (!session) {
      throw new Error('Session ist erforderlich, um resumeSession aufzurufen.')
    }
    await this.agent.resumeSession(session)
    return this.agent.session
  }

  /**
   * Meldet den Agenten ab (falls unterstützt) und verwirft die Session.
   */
  async logout () {
    try {
      if (typeof this.agent.logout === 'function') {
        await this.agent.logout()
      }
    } finally {
      this.agent.session = undefined
    }
  }

  /**
   * Gibt die aktuell bekannte Session zurück (oder null).
   */
  getSession () {
    return this.agent?.session || null
  }

  /**
   * Liefert das zugrundeliegende BskyAgent-Objekt.
   */
  getAgent () {
    return this.agent
  }

  /**
   * Liefert die normalisierte Service-URL.
   */
  getServiceUrl () {
    return this.serviceUrl
  }

  /**
   * Lädt das Profil des aktuellen (oder übergebenen) Accounts.
   * @param {{ actor?: string }} options
   */
  async fetchProfile ({ actor } = {}) {
    const targetActor = actor || this.agent?.session?.did
    if (!targetActor) {
      throw new Error('Keine Session verfügbar, um ein Profil abzurufen.')
    }
    const response = await this.agent.getProfile({ actor: targetActor })
    return response?.data || response
  }
}

/**
 * Convenience-Helfer, um eine neue Client-Instanz zu erzeugen.
 * @param {{ serviceUrl?: string }} options
 */
export function createBskyAgentClient (options = {}) {
  return new BskyAgentClient(options)
}

let activeClientProvider = null

export function setActiveBskyAgentProvider (provider) {
  if (typeof provider === 'function') {
    activeClientProvider = provider
  } else {
    activeClientProvider = null
  }
}

export function getActiveBskyAgentClient () {
  if (!activeClientProvider) return null
  try {
    return activeClientProvider() || null
  } catch (error) {
    console.warn('Failed to resolve active BskyAgentClient', error)
    return null
  }
}
