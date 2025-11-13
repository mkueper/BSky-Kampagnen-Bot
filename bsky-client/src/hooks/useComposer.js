import { useCallback } from 'react'
import { useAppDispatch } from '../context/AppContext'

function normalizeQuoteTarget (source) {
  if (!source) return null
  const rawPost = source?.raw?.post || null
  const record = rawPost?.record || source?.record || {}
  const author = source?.author || rawPost?.author || record?.author || {}
  const uri = source?.uri || rawPost?.uri || record?.uri || ''
  const cid = source?.cid || rawPost?.cid || record?.cid || ''
  if (!uri || !cid) return null

  return {
    uri,
    cid,
    text: source?.text || record?.text || '',
    author: {
      handle: author?.handle || '',
      displayName: author?.displayName || author?.handle || '',
      avatar: author?.avatar || null
    }
  }
}

export function useComposer () {
  const dispatch = useAppDispatch()

  const setReplyTarget = useCallback(
    (target) => dispatch({ type: 'SET_REPLY_TARGET', payload: target || null }),
    [dispatch]
  )
  const setQuoteTarget = useCallback(
    (target) => dispatch({ type: 'SET_QUOTE_TARGET', payload: target || null }),
    [dispatch]
  )

  const resetComposerTargets = useCallback(
    () => dispatch({ type: 'RESET_COMPOSER_TARGETS' }),
    [dispatch]
  )

  const setComposeOpen = useCallback(
    (open) => dispatch({ type: 'SET_COMPOSE_OPEN', payload: Boolean(open) }),
    [dispatch]
  )

  const openReplyComposer = useCallback((target) => {
    if (!target) return
    setQuoteTarget(null)
    setReplyTarget(target)
    setComposeOpen(true)
  }, [setComposeOpen, setQuoteTarget, setReplyTarget])

  const openQuoteComposer = useCallback((source) => {
    const normalized = normalizeQuoteTarget(source)
    if (!normalized) return
    setReplyTarget(null)
    setQuoteTarget(normalized)
    setComposeOpen(true)
  }, [setComposeOpen, setQuoteTarget, setReplyTarget])

  const closeComposer = useCallback(() => {
    setComposeOpen(false)
    resetComposerTargets()
  }, [resetComposerTargets, setComposeOpen])

  const openComposer = useCallback(() => setComposeOpen(true), [setComposeOpen])

  return {
    openComposer,
    closeComposer,
    openReplyComposer,
    openQuoteComposer,
    resetComposerTargets,
    setReplyTarget,
    setQuoteTarget
  }
}
