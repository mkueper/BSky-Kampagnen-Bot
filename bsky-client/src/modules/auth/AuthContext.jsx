import { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { createBskyAgentClient, setActiveBskyAgentProvider } from '../shared/api/bskyAgentClient.js'

const STORAGE_KEYS = {
  credentials: 'bsky_client_auth_credentials', // legacy: Login-Form Prefill
  session: 'bsky_client_auth_session', // legacy: Single-Account Session
  accounts: 'bsky_client_auth_accounts_v1',
  activeAccountId: 'bsky_client_auth_active_account_v1'
}

function safeParse (value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function safeString (value) {
  return typeof value === 'string' ? value : ''
}

function normalizeServiceUrl (value, fallback) {
  const candidate = safeString(value).trim()
  if (!candidate) return fallback
  return candidate
}

function normalizeAccount (value, fallbackServiceUrl) {
  if (!value || typeof value !== 'object') return null
  const id = safeString(value.id).trim()
  const serviceUrl = normalizeServiceUrl(value.serviceUrl, fallbackServiceUrl)
  if (!id || !serviceUrl) return null
  const identifier = safeString(value.identifier).trim()
  const handle = safeString(value.handle).trim()
  const did = safeString(value.did).trim()
  const displayName = safeString(value.displayName).trim()
  const avatar = safeString(value.avatar).trim()
  const rememberCredentials = Boolean(value.rememberCredentials)
  const rememberSession = Boolean(value.rememberSession)
  const session = value.session && typeof value.session === 'object' ? value.session : null
  return {
    id,
    serviceUrl,
    identifier,
    handle,
    did,
    displayName,
    avatar,
    rememberCredentials,
    rememberSession,
    session
  }
}

function deriveAccountId ({ did, handle, identifier }) {
  const didValue = safeString(did).trim()
  if (didValue) return didValue
  const handleValue = safeString(handle).trim()
  if (handleValue) return handleValue
  const identifierValue = safeString(identifier).trim()
  if (identifierValue) return identifierValue
  return `account-${Date.now()}`
}

function makeAccountSummary (account, activeAccountId) {
  if (!account) return null
  return {
    id: account.id,
    serviceUrl: account.serviceUrl,
    identifier: account.identifier,
    did: account.did,
    handle: account.handle,
    displayName: account.displayName,
    avatar: account.avatar,
    rememberCredentials: account.rememberCredentials,
    rememberSession: account.rememberSession,
    hasSession: Boolean(account.session),
    isActive: account.id === activeAccountId,
    actor: account.did || account.handle || null
  }
}

export const AuthContext = createContext(null)

export function AuthProvider ({ children }) {
  const [status, setStatus] = useState('loading') // loading | unauthenticated | authenticated
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [client, setClient] = useState(() => createBskyAgentClient())
  const [accounts, setAccounts] = useState([])
  const [activeAccountId, setActiveAccountId] = useState(null)
  const [addAccount, setAddAccount] = useState(() => ({ open: false, prefill: null }))
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

  const persistAccounts = useCallback((nextAccounts, nextActiveAccountId = undefined) => {
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(nextAccounts))
    if (nextActiveAccountId === undefined) return
    if (nextActiveAccountId) {
      localStorage.setItem(STORAGE_KEYS.activeAccountId, String(nextActiveAccountId))
      return
    }
    localStorage.removeItem(STORAGE_KEYS.activeAccountId)
  }, [])

  const updateAccount = useCallback((accountId, patch) => {
    setAccounts(prev => {
      const next = prev.map(entry => (entry.id === accountId ? { ...entry, ...patch } : entry))
      persistAccounts(next)
      return next
    })
  }, [persistAccounts])

  const refreshProfile = useCallback(async ({ client: providedClient, accountId: providedAccountId } = {}) => {
    const activeClient = providedClient || clientRef.current
    if (!activeClient) return null
    try {
      const nextProfile = await activeClient.fetchProfile()
      setProfile(nextProfile)
      const targetAccountId = providedAccountId || activeAccountId
      if (nextProfile && targetAccountId) {
        updateAccount(targetAccountId, {
          did: nextProfile.did || '',
          handle: nextProfile.handle || '',
          displayName: nextProfile.displayName || '',
          avatar: nextProfile.avatar || ''
        })
      }
      return nextProfile
    } catch (error) {
      console.warn('Failed to fetch profile', error)
      throw error
    }
  }, [activeAccountId, updateAccount])

  useEffect(() => {
    let cancelled = false
    const ensureClient = (serviceUrl) => {
      const current = clientRef.current
      if (current && current.getServiceUrl() === serviceUrl) return current
      const nextClient = createBskyAgentClient({ serviceUrl })
      clientRef.current = nextClient
      if (!cancelled) setClient(nextClient)
      return nextClient
    }

    const hydrateFromLegacyStorage = (fallbackServiceUrl) => {
      const storedCreds = safeParse(localStorage.getItem(STORAGE_KEYS.credentials))
      const storedSession = safeParse(localStorage.getItem(STORAGE_KEYS.session))
      if (!storedCreds && !storedSession) return null
      const legacyServiceUrl = normalizeServiceUrl(storedCreds?.serviceUrl, fallbackServiceUrl)
      const legacyIdentifier = safeString(storedCreds?.identifier).trim()
      const id = deriveAccountId({ identifier: legacyIdentifier })
      const legacyAccount = {
        id,
        serviceUrl: legacyServiceUrl,
        identifier: legacyIdentifier,
        handle: '',
        did: '',
        displayName: '',
        avatar: '',
        rememberCredentials: Boolean(storedCreds),
        rememberSession: Boolean(storedSession),
        session: storedSession && typeof storedSession === 'object' ? storedSession : null
      }
      return legacyAccount
    }

    const bootstrapAuth = async () => {
      const fallbackServiceUrl = clientRef.current?.getServiceUrl?.() || 'https://bsky.social'
      const storedAccountsRaw = safeParse(localStorage.getItem(STORAGE_KEYS.accounts), [])
      const normalizedAccounts = Array.isArray(storedAccountsRaw)
        ? storedAccountsRaw
            .map(entry => normalizeAccount(entry, fallbackServiceUrl))
            .filter(Boolean)
        : []
      const legacyAccount = normalizedAccounts.length === 0
        ? hydrateFromLegacyStorage(fallbackServiceUrl)
        : null

      const accountsToUse = legacyAccount ? [legacyAccount] : normalizedAccounts
      const storedActiveId = safeString(localStorage.getItem(STORAGE_KEYS.activeAccountId)).trim()
      const nextActiveId =
        (storedActiveId && accountsToUse.some(acc => acc.id === storedActiveId))
          ? storedActiveId
          : (accountsToUse[0]?.id || null)

      if (!cancelled) {
        setAccounts(accountsToUse)
        setActiveAccountId(nextActiveId)
      }
      if (legacyAccount) {
        persistAccounts(accountsToUse, nextActiveId)
      }

      const activeAccount = nextActiveId
        ? accountsToUse.find(acc => acc.id === nextActiveId) || null
        : null

      if (activeAccount) {
        setPreferences(prev => ({
          ...prev,
          serviceUrl: activeAccount.serviceUrl || prev.serviceUrl,
          identifier: activeAccount.rememberCredentials
            ? (activeAccount.identifier || activeAccount.handle || prev.identifier)
            : prev.identifier,
          rememberCredentials: Boolean(activeAccount.rememberCredentials),
          rememberSession: Boolean(activeAccount.rememberSession && activeAccount.session)
        }))
      }

      if (!activeAccount?.session) {
        if (!cancelled) setStatus('unauthenticated')
        return
      }

      const activeClient = ensureClient(activeAccount.serviceUrl)
      try {
        const activeSession = await activeClient.resumeSession(activeAccount.session)
        if (cancelled) return
        setSession(activeSession)
        setStatus('authenticated')
        setAccounts(prev => {
          const next = prev.map(acc => acc.id === activeAccount.id
            ? { ...acc, session: activeSession, rememberSession: true }
            : acc
          )
          persistAccounts(next, activeAccount.id)
          return next
        })
        await refreshProfile({ client: activeClient, accountId: activeAccount.id })
      } catch (error) {
        console.warn('Failed to resume session', error)
        setAccounts(prev => {
          const next = prev.map(acc => acc.id === activeAccount.id
            ? { ...acc, session: null, rememberSession: false }
            : acc
          )
          persistAccounts(next, activeAccount.id)
          return next
        })
        if (!cancelled) {
          setSession(null)
          setProfile(null)
          setStatus('unauthenticated')
        }
      } finally {
        // Legacy keys are not used anymore once migrated.
        localStorage.removeItem(STORAGE_KEYS.session)
      }
    }
    bootstrapAuth()
    return () => {
      cancelled = true
    }
  }, [refreshProfile, persistAccounts, updateAccount])

  const login = useCallback(
    async ({ serviceUrl, identifier, appPassword, rememberCredentials, rememberSession, asNewAccount = false }) => {
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
      const nextProfile = await (async () => {
        try {
          return await agent.fetchProfile()
        } catch {
          return null
        }
      })()
      const nextAccountId = deriveAccountId({
        did: nextProfile?.did,
        handle: nextProfile?.handle,
        identifier
      })
      const accountPatch = {
        id: nextAccountId,
        serviceUrl: agent.getServiceUrl(),
        identifier: rememberCredentials ? identifier : '',
        rememberCredentials: Boolean(rememberCredentials),
        rememberSession: Boolean(rememberSession),
        session: rememberSession ? nextSession : null,
        did: nextProfile?.did || '',
        handle: nextProfile?.handle || '',
        displayName: nextProfile?.displayName || '',
        avatar: nextProfile?.avatar || ''
      }

      setAccounts(prev => {
        const existingIndex = prev.findIndex(acc => acc.id === nextAccountId)
        const nextAccounts = existingIndex >= 0
          ? prev.map(acc => (acc.id === nextAccountId ? { ...acc, ...accountPatch } : acc))
          : [...prev, accountPatch]
        persistAccounts(nextAccounts, nextAccountId)
        return nextAccounts
      })
      setActiveAccountId(nextAccountId)
      setProfile(nextProfile || null)
      if (asNewAccount) {
        setAddAccount({ open: false, prefill: null })
      }
      if (!rememberSession) {
        localStorage.removeItem(STORAGE_KEYS.session)
      }
      return nextSession
    },
    [persistAccounts, persistPreferences]
  )

  const beginAddAccount = useCallback((prefill = null) => {
    setAddAccount({
      open: true,
      prefill: prefill && typeof prefill === 'object'
        ? {
            serviceUrl: safeString(prefill.serviceUrl).trim() || null,
            identifier: safeString(prefill.identifier).trim() || null
          }
        : null
    })
  }, [])

  const cancelAddAccount = useCallback(() => {
    setAddAccount({ open: false, prefill: null })
  }, [])

  const switchAccount = useCallback(async (nextId) => {
    const targetId = safeString(nextId).trim()
    if (!targetId || targetId === activeAccountId) return
    const targetAccount = accounts.find(acc => acc.id === targetId) || null
    if (!targetAccount) return
    if (!targetAccount.session) {
      beginAddAccount({
        serviceUrl: targetAccount.serviceUrl,
        identifier: targetAccount.identifier || targetAccount.handle || ''
      })
      return
    }
    setStatus('loading')
    const agent = createBskyAgentClient({ serviceUrl: targetAccount.serviceUrl })
    try {
      const activeSession = await agent.resumeSession(targetAccount.session)
      clientRef.current = agent
      setClient(agent)
      setSession(activeSession)
      setActiveAccountId(targetId)
      localStorage.setItem(STORAGE_KEYS.activeAccountId, targetId)
      setPreferences(prev => ({
        ...prev,
        serviceUrl: targetAccount.serviceUrl || prev.serviceUrl,
        identifier: targetAccount.rememberCredentials
          ? (targetAccount.identifier || targetAccount.handle || prev.identifier)
          : prev.identifier,
        rememberCredentials: Boolean(targetAccount.rememberCredentials),
        rememberSession: Boolean(targetAccount.rememberSession && targetAccount.session)
      }))
      setStatus('authenticated')
      updateAccount(targetId, { session: activeSession, rememberSession: true })
      await refreshProfile({ client: agent, accountId: targetId })
    } catch (error) {
      console.warn('Failed to switch account', error)
      updateAccount(targetId, { session: null, rememberSession: false })
      beginAddAccount({
        serviceUrl: targetAccount.serviceUrl,
        identifier: targetAccount.identifier || targetAccount.handle || ''
      })
      setStatus('authenticated')
    }
  }, [accounts, activeAccountId, beginAddAccount, refreshProfile, updateAccount])

  const logout = useCallback(async () => {
    const currentId = activeAccountId
    try {
      await client.logout()
    } catch (err) {
      console.warn('logout failed', err)
    } finally {
      setSession(null)
      setProfile(null)
      if (currentId) {
        setAccounts(prev => {
          const next = prev.map(acc => (acc.id === currentId ? { ...acc, session: null, rememberSession: false } : acc))
          persistAccounts(next)
          return next
        })
      }
      const fallbackAccount = accounts.find(acc => acc.id !== currentId && acc.session) || null
      if (fallbackAccount) {
        await switchAccount(fallbackAccount.id)
      } else {
        setStatus('unauthenticated')
      }
    }
  }, [accounts, activeAccountId, client, persistAccounts, switchAccount])

  const value = useMemo(() => ({
    status,
    session,
    client,
    preferences,
    profile,
    accounts: accounts.map(acc => makeAccountSummary(acc, activeAccountId)).filter(Boolean),
    activeAccountId,
    addAccount,
    login,
    logout,
    switchAccount,
    beginAddAccount,
    cancelAddAccount,
    refreshProfile,
    setPreferences: persistPreferences
  }), [status, session, client, preferences, profile, accounts, activeAccountId, addAccount, login, logout, switchAccount, beginAddAccount, cancelAddAccount, refreshProfile, persistPreferences])

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
