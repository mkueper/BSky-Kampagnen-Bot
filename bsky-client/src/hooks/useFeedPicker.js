import { useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppState } from '../context/AppContext'
import {
  fetchFeeds,
  pinFeed as pinFeedRequest,
  unpinFeed as unpinFeedRequest,
  reorderPinnedFeeds as reorderPinnedFeedsRequest
} from '../modules/shared/api/bsky.js'

function normalizeFeedLists (data = {}, fallback = {}) {
  return {
    pinned: Array.isArray(data?.pinned) ? data.pinned : fallback.pinned || [],
    saved: Array.isArray(data?.saved) ? data.saved : fallback.saved || [],
    errors: Array.isArray(data?.errors) ? data.errors : []
  }
}

export function useFeedPicker () {
  const { feedPicker, feedManagerOpen } = useAppState()
  const dispatch = useAppDispatch()
  const lastUpdatedRef = useRef(feedPicker?.lastUpdatedAt || 0)
  const pinnedFeeds = feedPicker?.pinned || []
  const savedFeeds = feedPicker?.saved || []

  const updateState = useCallback((patch) => {
    dispatch({ type: 'SET_FEED_PICKER_STATE', payload: patch })
  }, [dispatch])

  useEffect(() => {
    lastUpdatedRef.current = feedPicker?.lastUpdatedAt || 0
  }, [feedPicker?.lastUpdatedAt])

  const refreshFeeds = useCallback(async ({ force = false } = {}) => {
    if (!force && lastUpdatedRef.current) return
    updateState({ loading: true, error: '', action: { refreshing: true } })
    try {
      const data = await fetchFeeds()
      updateState({
        loading: false,
        error: '',
        pinned: Array.isArray(data?.pinned) ? data.pinned : [],
        saved: Array.isArray(data?.saved) ? data.saved : [],
        errors: Array.isArray(data?.errors) ? data.errors : [],
        lastUpdatedAt: Date.now(),
        action: { refreshing: false }
      })
    } catch (error) {
      updateState({
        loading: false,
        error: error?.message || 'Feeds konnten nicht geladen werden.',
        action: { refreshing: false }
      })
    }
  }, [updateState])

  const pinFeed = useCallback(async (feedUri) => {
    if (!feedUri) return
    updateState({ action: { pinning: feedUri } })
    try {
      const data = await pinFeedRequest({ feedUri })
      const lists = normalizeFeedLists(data, { pinned: pinnedFeeds, saved: savedFeeds })
      updateState({
        pinned: lists.pinned,
        saved: lists.saved,
        errors: lists.errors,
        action: { pinning: '', unpinning: '', savingOrder: false }
      })
    } catch (error) {
      updateState({
        error: error?.message || 'Feed konnte nicht angepinnt werden.',
        action: { pinning: '' }
      })
    } finally {
      updateState({ action: { pinning: '' } })
    }
  }, [pinnedFeeds, savedFeeds, updateState])

  const unpinFeed = useCallback(async (feedUri) => {
    if (!feedUri) return
    updateState({ action: { unpinning: feedUri } })
    try {
      const data = await unpinFeedRequest({ feedUri })
      const lists = normalizeFeedLists(data, { pinned: pinnedFeeds, saved: savedFeeds })
      updateState({
        pinned: lists.pinned,
        saved: lists.saved,
        errors: lists.errors,
        action: { unpinning: '', pinning: '', savingOrder: false }
      })
    } catch (error) {
      updateState({
        error: error?.message || 'Feed konnte nicht entfernt werden.',
        action: { unpinning: '' }
      })
    } finally {
      updateState({ action: { unpinning: '' } })
    }
  }, [pinnedFeeds, savedFeeds, updateState])

  const reorderPinnedFeeds = useCallback(async (order) => {
    if (!Array.isArray(order) || order.length === 0) return
    updateState({ action: { savingOrder: true } })
    try {
      const data = await reorderPinnedFeedsRequest({ order })
      const lists = normalizeFeedLists(data, { pinned: pinnedFeeds, saved: savedFeeds })
      updateState({
        pinned: lists.pinned,
        saved: lists.saved,
        errors: lists.errors,
        action: { savingOrder: false }
      })
    } catch (error) {
      updateState({
        error: error?.message || 'Reihenfolge konnte nicht gespeichert werden.',
        action: { savingOrder: false }
      })
    }
  }, [pinnedFeeds, savedFeeds, updateState])

  const openFeedManager = useCallback(() => {
    dispatch({ type: 'SET_FEED_MANAGER_OPEN', payload: true })
  }, [dispatch])

  const closeFeedManager = useCallback(() => {
    dispatch({ type: 'SET_FEED_MANAGER_OPEN', payload: false })
  }, [dispatch])

  return {
    feedPicker,
    feedManagerOpen,
    refreshFeeds,
    pinFeed,
    unpinFeed,
    reorderPinnedFeeds,
    openFeedManager,
    closeFeedManager
  }
}
