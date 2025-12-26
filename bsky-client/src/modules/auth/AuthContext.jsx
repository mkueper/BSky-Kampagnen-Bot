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

function getAccountCanonicalId (account) {
  if (!account) return ''
  const did = safeString(account.did).trim()
  if (did) return did
  const handle = safeString(account.handle).trim()
  if (handle) return handle
  const identifier = safeString(account.identifier).trim()
  if (identifier) return identifier
  return safeString(account.id).trim()
}

function getAccountDedupKey (account) {
  if (!account) return ''
  const did = safeString(account.did).trim()
  if (did) return `did:${did}`
  const serviceUrl = safeString(account.serviceUrl).trim()
  const handle = safeString(account.handle).trim()
  if (serviceUrl && handle) return `handle:${serviceUrl}|${handle.toLowerCase()}`
  const identifier = safeString(account.identifier).trim()
  if (serviceUrl && identifier) return `identifier:${serviceUrl}|${identifier.toLowerCase()}`
  const id = safeString(account.id).trim()
  return id ? `id:${id}` : ''
}

function mergeAccountRecords (base, incoming) {
  if (!base) return incoming
  if (!incoming) return base
  const merged = { ...base }
  merged.serviceUrl = incoming.serviceUrl || base.serviceUrl
  merged.identifier = incoming.identifier !== undefined ? incoming.identifier : base.identifier
  merged.handle = incoming.handle !== undefined ? incoming.handle : base.handle
  merged.did = incoming.did !== undefined ? incoming.did : base.did
  merged.displayName = incoming.displayName !== undefined ? incoming.displayName : base.displayName
  merged.avatar = incoming.avatar !== undefined ? incoming.avatar : base.avatar
  merged.rememberCredentials = Boolean(base.rememberCredentials || incoming.rememberCredentials)
  merged.rememberSession = Boolean(base.rememberSession || incoming.rememberSession)
  merged.session = incoming.session !== undefined ? incoming.session : base.session
  return merged
}

function isStoredSessionValid (session) {
  if (!session || typeof session !== 'object') return false
  const accessJwt = safeString(session.accessJwt).trim()
  const refreshJwt = safeString(session.refreshJwt).trim()
  const did = safeString(session.did).trim()
  return Boolean(accessJwt && refreshJwt && did)
}

function normalizeAccountsList (accounts, requestedActiveId) {
  const map = new Map()
  const idRewrite = new Map()
  const orderedKeys = []
  for (const account of accounts || []) {
    const dedupKey = getAccountDedupKey(account)
    if (!dedupKey) continue
    if (!map.has(dedupKey)) {
      map.set(dedupKey, account)
      orderedKeys.push(dedupKey)
    } else {
      map.set(dedupKey, mergeAccountRecords(map.get(dedupKey), account))
    }
  }
  const normalized = []
  for (const key of orderedKeys) {
    const account = map.get(key)
    if (!account) continue
    const canonicalId = getAccountCanonicalId(account)
    if (canonicalId && canonicalId !== account.id) {
      idRewrite.set(account.id, canonicalId)
      normalized.push({ ...account, id: canonicalId })
    } else {
      normalized.push(account)
    }
  }

  const rewrittenActiveId = idRewrite.get(requestedActiveId) || requestedActiveId
  const activeIdCandidate = rewrittenActiveId && normalized.some(acc => acc.id === rewrittenActiveId)
    ? rewrittenActiveId
    : (normalized[0]?.id || null)

  return {
    accounts: normalized,
    activeAccountId: activeIdCandidate,
    changed:
      normalized.length !== (accounts || []).length ||
      idRewrite.size > 0 ||
      activeIdCandidate !== requestedActiveId
  }
}

export const AuthContext = createContext(null)

export function AuthProvider ({ children }) {
  const [status, setStatus] = useState('loading') // loading | unauthenticated | authenticated
  const [statusDetail, setStatusDetail] = useState('bootstrap') // bootstrap | login | switch-account | null
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
    if (!Array.isArray(accounts) || accounts.length === 0) return
    const { accounts: normalized, activeAccountId: normalizedActiveId, changed } =
      normalizeAccountsList(accounts, activeAccountId)
    if (!changed) return
    setAccounts(normalized)
    setActiveAccountId(normalizedActiveId)
    persistAccounts(normalized, normalizedActiveId)
  }, [accounts, activeAccountId, persistAccounts])

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

      const rawAccountsToUse = legacyAccount ? [legacyAccount] : normalizedAccounts
      const storedActiveId = safeString(localStorage.getItem(STORAGE_KEYS.activeAccountId)).trim()
      const requestedActiveId =
        (storedActiveId && rawAccountsToUse.some(acc => acc.id === storedActiveId))
          ? storedActiveId
          : (rawAccountsToUse[0]?.id || null)

      const { accounts: accountsToUse, activeAccountId: nextActiveId, changed } =
        normalizeAccountsList(rawAccountsToUse, requestedActiveId)

      if (!cancelled) {
        setAccounts(accountsToUse)
        setActiveAccountId(nextActiveId)
      }
      if (legacyAccount || changed) {
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
        if (activeAccount && !activeAccount.rememberSession) {
          setAccounts(prev => {
            const next = prev.map(acc => acc.id === activeAccount.id
              ? { ...acc, session: null }
              : acc
            )
            persistAccounts(next, activeAccount.id)
            return next
          })
        }
        if (!cancelled) {
          setStatus('unauthenticated')
          setStatusDetail(null)
        }
        return
      }

      if (!activeAccount.rememberSession || !isStoredSessionValid(activeAccount.session)) {
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
          setStatusDetail(null)
        }
        return
      }

      const activeClient = ensureClient(activeAccount.serviceUrl)
      try {
        const activeSession = await activeClient.resumeSession(activeAccount.session)
        if (cancelled) return
        setSession(activeSession)
        setStatus('authenticated')
        setStatusDetail(null)
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
          setStatusDetail(null)
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
      const previousStatus = status
      setStatus('loading')
      setStatusDetail('login')
      try {
        const agent = createBskyAgentClient({ serviceUrl })
        const nextSession = await agent.login({ identifier, appPassword })
        clientRef.current = agent
        setClient(agent)
        setSession(nextSession)
        setStatus('authenticated')
        setStatusDetail(null)
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
          const canonicalId = nextAccountId
          const service = accountPatch.serviceUrl
          const identifierValue = safeString(identifier).trim().toLowerCase()
          const handleValue = safeString(accountPatch.handle).trim().toLowerCase()
          const didValue = safeString(accountPatch.did).trim()

          const findByIdentity = (acc) => {
            if (!acc) return false
            const accDid = safeString(acc.did).trim()
            if (didValue && accDid && accDid === didValue) return true
            const accHandle = safeString(acc.handle).trim().toLowerCase()
            if (handleValue && accHandle && accHandle === handleValue && acc.serviceUrl === service) return true
            const accIdentifier = safeString(acc.identifier).trim().toLowerCase()
            if (identifierValue && accIdentifier && accIdentifier === identifierValue && acc.serviceUrl === service) return true
            return false
          }

          const candidates = prev.filter(findByIdentity)
          const merged = candidates.reduce((acc, entry) => mergeAccountRecords(acc, entry), null)
          const mergedAccount = mergeAccountRecords(merged, accountPatch)
          const finalAccount = { ...mergedAccount, id: canonicalId }

          const withoutCandidates = prev.filter(acc => !findByIdentity(acc) && acc.id !== canonicalId)
          const existingCanonical = prev.find(acc => acc.id === canonicalId)
          const nextAccountsRaw = existingCanonical
            ? [...withoutCandidates, mergeAccountRecords(existingCanonical, finalAccount)]
            : [...withoutCandidates, finalAccount]

          const { accounts: normalized, activeAccountId: normalizedActiveId } =
            normalizeAccountsList(nextAccountsRaw, canonicalId)

          persistAccounts(normalized, normalizedActiveId)
          return normalized
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
      } catch (error) {
        setStatus(asNewAccount && previousStatus === 'authenticated' ? 'authenticated' : 'unauthenticated')
        setStatusDetail(null)
        throw error
      }
    },
    [persistAccounts, persistPreferences, status]
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
    if (!targetAccount.rememberSession || !isStoredSessionValid(targetAccount.session)) {
      updateAccount(targetId, { session: null, rememberSession: false })
      beginAddAccount({
        serviceUrl: targetAccount.serviceUrl,
        identifier: targetAccount.identifier || targetAccount.handle || ''
      })
      return
    }
    setStatus('loading')
    setStatusDetail('switch-account')
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
      setStatusDetail(null)
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
      setStatusDetail(null)
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
      const fallbackAccount =
        accounts.find(acc => acc.id !== currentId && acc.rememberSession && isStoredSessionValid(acc.session)) || null
      if (fallbackAccount) {
        await switchAccount(fallbackAccount.id)
      } else {
        setStatus('unauthenticated')
        setStatusDetail(null)
      }
    }
  }, [accounts, activeAccountId, client, persistAccounts, switchAccount])

  const value = useMemo(() => ({
    status,
    statusDetail,
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
  }), [status, statusDetail, session, client, preferences, profile, accounts, activeAccountId, addAccount, login, logout, switchAccount, beginAddAccount, cancelAddAccount, refreshProfile, persistPreferences])

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
