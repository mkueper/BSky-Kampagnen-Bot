import { useCallback, useEffect, useRef } from 'react'
import { useTimelineDispatch, useTimelineState } from '../context/TimelineContext.jsx'
import {
  fetchFeeds,
  fetchDiscoverFeeds,
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
  const { feedPicker, feedManagerOpen } = useTimelineState()
  const dispatch = useTimelineDispatch()
  const lastUpdatedRef = useRef(feedPicker?.lastUpdatedAt || 0)
  const pinnedFeeds = feedPicker?.pinned || []
  const savedFeeds = feedPicker?.saved || []
  const draftPinned = Array.isArray(feedPicker?.draft?.pinned) ? feedPicker.draft.pinned : []
  const draftSaved = Array.isArray(feedPicker?.draft?.saved) ? feedPicker.draft.saved : []
  const draftDirty = Boolean(feedPicker?.draft?.dirty)
  const discoverFeeds = Array.isArray(feedPicker?.discover) ? feedPicker.discover : []
  const discoverCursor = feedPicker?.discoverCursor || null
  const discoverHasMore = Boolean(feedPicker?.discoverHasMore)
  const discoverLoadingMore = Boolean(feedPicker?.discoverLoadingMore)

  const updateState = useCallback((patch) => {
    dispatch({ type: 'SET_FEED_PICKER_STATE', payload: patch })
  }, [dispatch])

  useEffect(() => {
    lastUpdatedRef.current = feedPicker?.lastUpdatedAt || 0
  }, [feedPicker?.lastUpdatedAt])

  const refreshFeeds = useCallback(async ({ force = false, loadDiscover = false } = {}) => {
    if (!force && lastUpdatedRef.current) return
    updateState({ loading: true, error: '', action: { refreshing: true } })
    try {
      const data = await fetchFeeds()
      let discoverItems = null
      let nextDiscoverCursor = null
      if (loadDiscover) {
        const discoverResponse = await fetchDiscoverFeeds().catch(() => ({ items: [], cursor: null }))
        discoverItems = Array.isArray(discoverResponse?.items) ? discoverResponse.items : []
        nextDiscoverCursor = discoverResponse?.cursor || null
      }
      updateState({
        loading: false,
        error: '',
        pinned: Array.isArray(data?.pinned) ? data.pinned : [],
        saved: Array.isArray(data?.saved) ? data.saved : [],
        ...(discoverItems !== null
          ? {
              discover: discoverItems,
              discoverCursor: nextDiscoverCursor,
              discoverHasMore: Boolean(nextDiscoverCursor),
              discoverLoadingMore: false
            }
          : {}),
        errors: Array.isArray(data?.errors) ? data.errors : [],
        lastUpdatedAt: Date.now(),
        action: { refreshing: false },
        ...(draftDirty ? {} : { draft: { pinned: Array.isArray(data?.pinned) ? data.pinned : [], saved: Array.isArray(data?.saved) ? data.saved : [], dirty: false } })
      })
    } catch (error) {
      updateState({
        loading: false,
        error: error?.message || 'Feeds konnten nicht geladen werden.',
        action: { refreshing: false }
      })
    }
  }, [draftDirty, updateState])

  const initFeedManagerDraft = useCallback(() => {
    updateState({
      draft: {
        pinned: [...pinnedFeeds],
        saved: [...savedFeeds],
        dirty: false
      }
    })
  }, [pinnedFeeds, savedFeeds, updateState])

  const setDraftState = useCallback((nextPinned, nextSaved) => {
    updateState({
      draft: {
        pinned: Array.isArray(nextPinned) ? nextPinned : [],
        saved: Array.isArray(nextSaved) ? nextSaved : [],
        dirty: true
      }
    })
  }, [updateState])

  const pinFeedDraft = useCallback((feed) => {
    if (!feed) return
    const feedUri = feed.feedUri || feed.value
    if (!feedUri) return
    const alreadyPinned = draftPinned.some((entry) => (entry.feedUri || entry.value) === feedUri)
    if (alreadyPinned) return
    const nextPinned = [...draftPinned, { ...feed, pinned: true }]
    const nextSaved = draftSaved.filter((entry) => (entry.feedUri || entry.value) !== feedUri)
    setDraftState(nextPinned, nextSaved)
  }, [draftPinned, draftSaved, setDraftState])

  const unpinFeedDraft = useCallback((feed) => {
    if (!feed) return
    const feedUri = feed.feedUri || feed.value
    if (!feedUri) return
    const nextPinned = draftPinned.filter((entry) => (entry.feedUri || entry.value) !== feedUri)
    const alreadySaved = draftSaved.some((entry) => (entry.feedUri || entry.value) === feedUri)
    const nextSaved = alreadySaved ? draftSaved : [...draftSaved, { ...feed, pinned: false }]
    setDraftState(nextPinned, nextSaved)
  }, [draftPinned, draftSaved, setDraftState])

  const reorderPinnedDraft = useCallback((nextPinned) => {
    if (!Array.isArray(nextPinned)) return
    setDraftState(nextPinned, draftSaved)
  }, [draftSaved, setDraftState])

  const saveFeedManagerDraft = useCallback(async () => {
    if (!draftDirty) return
    updateState({ action: { savingOrder: true }, error: '' })
    try {
      const originalPinned = pinnedFeeds || []
      const originalSaved = savedFeeds || []
      const originalPinnedKeys = new Set(originalPinned.map((entry) => entry.feedUri || entry.value).filter(Boolean))
      const draftPinnedKeys = new Set(draftPinned.map((entry) => entry.feedUri || entry.value).filter(Boolean))
      const toPin = draftPinned.filter((entry) => {
        const key = entry.feedUri || entry.value
        return key && !originalPinnedKeys.has(key)
      })
      const toUnpin = originalPinned.filter((entry) => {
        const key = entry.feedUri || entry.value
        return key && !draftPinnedKeys.has(key)
      })

      for (const entry of toPin) {
        await pinFeedRequest({ feedUri: entry.feedUri || entry.value })
      }
      for (const entry of toUnpin) {
        await unpinFeedRequest({ feedUri: entry.feedUri || entry.value })
      }

      const order = draftPinned.map((entry) => entry.id).filter(Boolean)
      if (order.length > 0) {
        await reorderPinnedFeedsRequest({ order })
      }

      const data = await fetchFeeds()
      const lists = normalizeFeedLists(data, { pinned: originalPinned, saved: originalSaved })
      updateState({
        pinned: lists.pinned,
        saved: lists.saved,
        errors: lists.errors,
        lastUpdatedAt: Date.now(),
        action: { savingOrder: false },
        draft: { pinned: lists.pinned, saved: lists.saved, dirty: false }
      })
    } catch (error) {
      updateState({
        error: error?.message || 'Änderungen konnten nicht gespeichert werden.',
        action: { savingOrder: false }
      })
    }
  }, [draftDirty, draftPinned, pinnedFeeds, savedFeeds, updateState])

  const pinFeed = useCallback(async (feedUri) => {
    if (!feedUri) return
    const previousDiscover = discoverFeeds
    const nextDiscover = previousDiscover.filter(
      (feed) => (feed?.feedUri || feed?.value) !== feedUri
    )
    updateState({ action: { pinning: feedUri }, discover: nextDiscover })
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
        discover: previousDiscover,
        action: { pinning: '' }
      })
    } finally {
      updateState({ action: { pinning: '' } })
    }
  }, [discoverFeeds, pinnedFeeds, savedFeeds, updateState])

  const loadMoreDiscover = useCallback(async () => {
    if (discoverLoadingMore || !discoverHasMore || !discoverCursor) return
    updateState({ discoverLoadingMore: true })
    try {
      const response = await fetchDiscoverFeeds({ cursor: discoverCursor })
      const items = Array.isArray(response?.items) ? response.items : []
      const nextCursor = response?.cursor || null
      const seen = new Set(
        discoverFeeds
          .map((entry) => entry?.feedUri || entry?.value)
          .filter(Boolean)
      )
      const merged = [
        ...discoverFeeds,
        ...items.filter((entry) => {
          const key = entry?.feedUri || entry?.value
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
      ]
      updateState({
        discover: merged,
        discoverCursor: nextCursor,
        discoverHasMore: Boolean(nextCursor),
        discoverLoadingMore: false
      })
    } catch (error) {
      console.warn('loadMoreDiscover failed', error)
      updateState({ discoverLoadingMore: false })
    }
  }, [discoverCursor, discoverFeeds, discoverHasMore, discoverLoadingMore, updateState])

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
    initFeedManagerDraft()
    dispatch({ type: 'SET_FEED_MANAGER_OPEN', payload: true })
  }, [dispatch, initFeedManagerDraft])

  const closeFeedManager = useCallback(() => {
    dispatch({ type: 'SET_FEED_MANAGER_OPEN', payload: false })
    updateState({ draft: { pinned: [], saved: [], dirty: false } })
  }, [dispatch, updateState])

  return {
    feedPicker,
    feedManagerOpen,
    draftPinned,
    draftSaved,
    draftDirty,
    refreshFeeds,
    pinFeed,
    unpinFeed,
    reorderPinnedFeeds,
    pinFeedDraft,
    unpinFeedDraft,
    reorderPinnedDraft,
    saveFeedManagerDraft,
    loadMoreDiscover,
    openFeedManager,
    closeFeedManager
  }
}
