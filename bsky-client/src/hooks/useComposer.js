import { useCallback } from 'react'
import { useComposerDispatch } from '../context/ComposerContext.jsx'

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
  const dispatch = useComposerDispatch()

  const setComposeMode = useCallback(
    (mode) => dispatch({ type: 'SET_COMPOSE_MODE', payload: mode === 'thread' ? 'thread' : 'single' }),
    [dispatch]
  )
  const setThreadSource = useCallback(
    (source) => dispatch({ type: 'SET_THREAD_SOURCE', payload: source || '' }),
    [dispatch]
  )
  const setThreadAppendNumbering = useCallback(
    (enabled) => dispatch({ type: 'SET_THREAD_APPEND_NUMBERING', payload: Boolean(enabled) }),
    [dispatch]
  )

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
    setComposeMode('single')
    setComposeOpen(true)
  }, [setComposeOpen, setComposeMode, setQuoteTarget, setReplyTarget])

  const openQuoteComposer = useCallback((source) => {
    const normalized = normalizeQuoteTarget(source)
    if (!normalized) return
    setReplyTarget(null)
    setQuoteTarget(normalized)
    setComposeMode('single')
    setComposeOpen(true)
  }, [setComposeOpen, setComposeMode, setQuoteTarget, setReplyTarget])

  const closeComposer = useCallback(() => {
    setComposeOpen(false)
    resetComposerTargets()
    setThreadSource('')
  }, [resetComposerTargets, setComposeOpen, setThreadSource])

  const openComposer = useCallback(() => {
    setComposeMode('single')
    setComposeOpen(true)
  }, [setComposeMode, setComposeOpen])

  const openThreadComposer = useCallback(() => {
    setReplyTarget(null)
    setQuoteTarget(null)
    setComposeMode('thread')
    setComposeOpen(true)
  }, [setComposeMode, setComposeOpen, setQuoteTarget, setReplyTarget])

  return {
    openComposer,
    openThreadComposer,
    closeComposer,
    openReplyComposer,
    openQuoteComposer,
    resetComposerTargets,
    setReplyTarget,
    setQuoteTarget,
    setComposeMode,
    setThreadSource,
    setThreadAppendNumbering
  }
}
