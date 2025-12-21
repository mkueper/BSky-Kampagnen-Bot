import { useEffect, useMemo, useState } from 'react'
import { getActiveBskyAgentClient } from '../modules/shared/api/bskyAgentClient.js'

const DEFAULT_STATE = {
  prefs: null,
  labelDefs: null,
  loading: false,
  error: null
}

let sharedAgent = null
let sharedState = { ...DEFAULT_STATE }
let pendingPromise = null
const subscribers = new Set()

const notifySubscribers = () => {
  subscribers.forEach((listener) => listener(sharedState))
}

const ensureLoadingState = () => {
  sharedState = { ...sharedState, loading: true, error: null }
  notifySubscribers()
}

const loadPreferences = async (agent) => {
  if (!agent) {
    sharedState = { ...DEFAULT_STATE, error: 'Keine aktive Session.' }
    notifySubscribers()
    return
  }
  if (pendingPromise) return pendingPromise
  ensureLoadingState()
  const activeAgent = agent
  pendingPromise = (async () => {
    try {
      const prefs = typeof activeAgent.getPreferences === 'function'
        ? await activeAgent.getPreferences()
        : (await activeAgent.app.bsky.actor.getPreferences()).data
      const moderationPrefs = prefs?.moderationPrefs || null
      const labelDefs = moderationPrefs ? await activeAgent.getLabelDefinitions(moderationPrefs) : null
      if (sharedAgent !== activeAgent) return
      sharedState = {
        prefs: moderationPrefs,
        labelDefs,
        loading: false,
        error: null
      }
      notifySubscribers()
    } catch (error) {
      if (sharedAgent !== activeAgent) return
      sharedState = { ...DEFAULT_STATE, error: error?.message || 'Moderation konnte nicht geladen werden.' }
      notifySubscribers()
    } finally {
      if (sharedAgent === activeAgent) {
        pendingPromise = null
      }
    }
  })()
  return pendingPromise
}

export function useModerationPreferences ({ enabled = true } = {}) {
  const [state, setState] = useState(DEFAULT_STATE)

  useEffect(() => {
    if (!enabled) {
      setState(DEFAULT_STATE)
      return () => {}
    }

    const client = getActiveBskyAgentClient()
    const agent = client?.getAgent?.() || null
    if (!agent) {
      setState({ ...DEFAULT_STATE, error: 'Keine aktive Session.' })
      return () => {}
    }

    if (sharedAgent !== agent) {
      sharedAgent = agent
      sharedState = { ...DEFAULT_STATE }
      pendingPromise = null
    }

    setState(sharedState)

    const handleUpdate = (nextState) => {
      setState(nextState)
    }
    subscribers.add(handleUpdate)

    if (!sharedState.prefs && !sharedState.loading && !pendingPromise) {
      loadPreferences(agent)
    }

    return () => {
      subscribers.delete(handleUpdate)
    }
  }, [enabled])

  return useMemo(() => state, [state])
}
