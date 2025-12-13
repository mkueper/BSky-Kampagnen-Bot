import { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { createBskyAgentClient, setActiveBskyAgentProvider } from '../shared/api/bskyAgentClient.js'

const STORAGE_KEYS = {
  credentials: 'bsky_client_auth_credentials',
  session: 'bsky_client_auth_session'
}

function safeParse (value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const AuthContext = createContext(null)

export function AuthProvider ({ children }) {
  const [status, setStatus] = useState('loading') // loading | unauthenticated | authenticated
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [client, setClient] = useState(() => createBskyAgentClient())
  const clientRef = useRef(client)
  const [preferences, setPreferences] = useState(() => ({
    serviceUrl: client.getServiceUrl(),
    rememberCredentials: false,
    rememberSession: false,
    identifier: ''
  }))

  useEffect(() => {
    clientRef.current = client
  }, [client])

  useEffect(() => {
    setActiveBskyAgentProvider(() => clientRef.current)
    return () => {
      setActiveBskyAgentProvider(null)
    }
  }, [])

  const persistPreferences = useCallback((patch = {}) => {
    setPreferences(prev => {
      const next = { ...prev, ...patch }
      if (next.rememberCredentials) {
        localStorage.setItem(
          STORAGE_KEYS.credentials,
          JSON.stringify({
            serviceUrl: next.serviceUrl,
            identifier: next.identifier
          })
        )
      } else {
        localStorage.removeItem(STORAGE_KEYS.credentials)
      }
      if (!next.rememberSession) {
        localStorage.removeItem(STORAGE_KEYS.session)
      }
      return next
    })
  }, [])

  const refreshProfile = useCallback(async ({ client: providedClient } = {}) => {
    const activeClient = providedClient || clientRef.current
    if (!activeClient) return null
    try {
      const nextProfile = await activeClient.fetchProfile()
      setProfile(nextProfile)
      return nextProfile
    } catch (error) {
      console.warn('Failed to fetch profile', error)
      throw error
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const bootstrapAuth = async () => {
      const storedCreds = safeParse(localStorage.getItem(STORAGE_KEYS.credentials))
      const storedSession = safeParse(localStorage.getItem(STORAGE_KEYS.session))
      let nextClient = clientRef.current
      if (storedCreds) {
        setPreferences(prev => ({
          ...prev,
          serviceUrl: storedCreds.serviceUrl || prev.serviceUrl,
          identifier: storedCreds.identifier || '',
          rememberCredentials: true,
          rememberSession: Boolean(storedSession)
        }))
        if (storedCreds.serviceUrl && storedCreds.serviceUrl !== nextClient.getServiceUrl()) {
          nextClient = createBskyAgentClient({ serviceUrl: storedCreds.serviceUrl })
          if (!cancelled) {
            clientRef.current = nextClient
            setClient(nextClient)
          }
        }
      }
      if (!storedSession) {
        if (!cancelled) setStatus('unauthenticated')
        return
      }
      try {
        const activeSession = await nextClient.resumeSession(storedSession)
        if (cancelled) return
        setSession(activeSession)
        setStatus('authenticated')
        await refreshProfile({ client: nextClient })
      } catch (error) {
        console.warn('Failed to resume session', error)
        localStorage.removeItem(STORAGE_KEYS.session)
        if (!cancelled) {
          setSession(null)
          setProfile(null)
          setStatus('unauthenticated')
        }
      }
    }
    bootstrapAuth()
    return () => {
      cancelled = true
    }
  }, [refreshProfile])

  const login = useCallback(
    async ({ serviceUrl, identifier, appPassword, rememberCredentials, rememberSession }) => {
      setStatus('loading')
      const agent = createBskyAgentClient({ serviceUrl })
      const nextSession = await agent.login({ identifier, appPassword })
      clientRef.current = agent
      setClient(agent)
      setSession(nextSession)
      setStatus('authenticated')
      persistPreferences({
        serviceUrl: agent.getServiceUrl(),
        identifier,
        rememberCredentials,
        rememberSession
      })
      if (rememberSession) {
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession))
      } else {
        localStorage.removeItem(STORAGE_KEYS.session)
      }
      try {
        await refreshProfile({ client: agent })
      } catch {
        // Profile-Fetch schlägt fehl -> Session bleibt trotzdem aktiv
      }
      return nextSession
    },
    [persistPreferences, refreshProfile]
  )

  const logout = useCallback(async () => {
    try {
      await client.logout()
    } catch (err) {
      console.warn('logout failed', err)
    } finally {
      setSession(null)
      setProfile(null)
      setStatus('unauthenticated')
      localStorage.removeItem(STORAGE_KEYS.session)
    }
  }, [client])

  const value = useMemo(() => ({
    status,
    session,
    client,
    preferences,
    profile,
    login,
    logout,
    refreshProfile,
    setPreferences: persistPreferences
  }), [status, session, client, preferences, profile, login, logout, refreshProfile, persistPreferences])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export function useBskyAuth () {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useBskyAuth must be used within AuthProvider')
  }
  return ctx
}
