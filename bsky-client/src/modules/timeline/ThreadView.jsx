import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SkeetItem from './SkeetItem'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { buildAuthorTimeline } from './threadUtils'
import { Button } from '../shared'
import BskyDetailPane from '../layout/BskyDetailPane.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const CONNECTOR_OFFSET = 28
const INDENT_STEP = 30
const BASE_PADDING = 32
const MAX_THREAD_DEPTH = 6

function ThreadNodeList ({
  nodes = [],
  depth = 0,
  maxDepth = MAX_THREAD_DEPTH,
  highlightUri,
  onReply,
  onQuote,
  onViewMedia,
  onSelect,
  onOpenDeepReplies
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null
  const { t } = useTranslation()

  return (
    <div className='space-y-4'>
      {nodes.map((node, idx) => {
        const key = node?.listEntryId || node?.uri || node?.cid || `thread-node-${depth}-${idx}`
        const isLast = idx === nodes.length - 1
        const hasChildren = Array.isArray(node?.replies) && node.replies.length > 0
        const showConnector = depth > 0 || !isLast || hasChildren
        const appliedIndent = depth * INDENT_STEP
        const connectorLeft = BASE_PADDING - 14 + appliedIndent
        const isFocus = highlightUri && node?.uri === highlightUri
        const nextDepth = depth + 1
        const allowChildRendering = hasChildren && nextDepth < maxDepth
        const showDepthStub = hasChildren && !allowChildRendering
        const verticalStyle = {
          top: depth === 0 ? `${CONNECTOR_OFFSET}px` : '0px',
          height: hasChildren || !isLast ? 'calc(100% + 16px)' : `${CONNECTOR_OFFSET}px`
        }
        const horizontalStyle = {
          top: `${CONNECTOR_OFFSET}px`
        }

        return (
          <div
            key={key}
            className='relative space-y-4'
          >
            <div
              className='relative'
              style={{ paddingLeft: BASE_PADDING + appliedIndent }}
            >
              {showConnector ? (
                <>
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute w-px bg-border/50'
                    style={{ ...verticalStyle, left: `${connectorLeft}px` }}
                  />
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute w-4 border-t border-border/50'
                    style={{ ...horizontalStyle, left: `${connectorLeft}px` }}
                  />
                </>
              ) : null}

              <div className={isFocus ? 'rounded-2xl ring-2 ring-primary/40' : ''}>
                <SkeetItem
                  item={node}
                  onReply={onReply}
                  onQuote={onQuote}
                  onViewMedia={onViewMedia}
                  onSelect={onSelect ? ((selected) => onSelect(selected || node)) : undefined}
                />
              </div>
            </div>

            {hasChildren ? (
              <div className='mt-2'>
                {allowChildRendering ? (
                  <ThreadNodeList
                    nodes={node.replies}
                    depth={nextDepth}
                    maxDepth={maxDepth}
                    highlightUri={highlightUri}
                    onReply={onReply}
                    onQuote={onQuote}
                    onViewMedia={onViewMedia}
                    onSelect={onSelect}
                    onOpenDeepReplies={onOpenDeepReplies}
                  />
                ) : (
                  <div style={{ paddingLeft: `${BASE_PADDING + appliedIndent + INDENT_STEP}px` }}>
                    <div className='rounded-2xl border border-dashed border-border/70 bg-background-subtle/40 p-3 text-sm text-foreground'>
                      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <p className='text-sm font-medium text-foreground'>{t('timeline.thread.depthStub.title', 'Weitere Antworten')}</p>
                        <button
                          type='button'
                          className='inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
                          onClick={() => onOpenDeepReplies?.({ parent: node, replies: node.replies })}
                        >
                          {t('timeline.thread.depthStub.action', 'Fortsetzen ({count})', { count: node.replies.length })}
                        </button>
                      </div>
                      <p className='mt-1 text-xs text-foreground-muted'>
                        {t('timeline.thread.depthStub.description', 'Noch mehr Antworten in dieser Verzweigung.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function ThreadView ({ registerLayoutHeader, renderHeaderInLayout = false }) {
  const { threadState: state, threadViewVariant } = useAppState()
  const dispatch = useAppDispatch()
  const { selectThreadFromItem, closeThread, reloadThread } = useThread()
  const { openMediaPreview } = useMediaLightbox()
  const { openReplyComposer, openQuoteComposer } = useComposer()
  const { t } = useTranslation()
  const [deepThreadStack, setDeepThreadStack] = useState([])
  const detailScrollRef = useRef(null)

  const { error, data, active, viewMode = 'full' } = state || {}
  const parents = Array.isArray(data?.parents) ? data.parents : []
  const focus = data?.focus || null
  const threadAuthorDid = focus?.author?.did || parents[0]?.author?.did || null

  const threadNodes = useMemo(() => {
    if (!focus) return parents.map((parent) => ({ ...parent, replies: [] }))

    const focusNode = {
      ...focus,
      replies: Array.isArray(focus.replies) ? focus.replies : []
    }

    if (parents.length === 0) {
      return [focusNode]
    }

    const parentClones = parents.map((parent) => ({ ...parent, replies: [] }))
    for (let i = parentClones.length - 1; i >= 0; i -= 1) {
      const current = parentClones[i]
      if (i === parentClones.length - 1) {
        current.replies = [focusNode]
      } else {
        current.replies = [parentClones[i + 1]]
      }
    }
    return [parentClones[0]]
  }, [focus, parents])

  const authorTimeline = useMemo(() => buildAuthorTimeline(data), [data])

  const branchCandidates = useMemo(() => {
    if (!focus) return []
    const branches = []
    const traverse = (node) => {
      const replies = Array.isArray(node?.replies) ? node.replies : []
      for (const reply of replies) {
        if (!threadAuthorDid || reply?.author?.did !== threadAuthorDid) {
          branches.push(reply)
        }
        traverse(reply)
      }
    }
    traverse(focus)
    return branches
      .map((entry) => ({
        ...entry,
        snippet: entry?.text || entry?.raw?.post?.record?.text || ''
      }))
      .slice(0, 25)
  }, [focus, threadAuthorDid])
  const handleClose = useCallback(() => {
    setDeepThreadStack([])
    closeThread({ force: true })
  }, [closeThread])

  const handleReload = useCallback(() => {
    reloadThread()
  }, [reloadThread])

  const handleUnroll = useCallback(() => {
    if (!state.isAuthorThread) return
    dispatch({ type: 'OPEN_THREAD_UNROLL' })
  }, [dispatch, state.isAuthorThread])

  const handleOpenDeepReplies = useCallback((payload) => {
    const parent = payload?.parent || null
    const replies = Array.isArray(payload?.replies) ? payload.replies : []
    if (!parent || replies.length === 0) return
    setDeepThreadStack((prev) => [...prev, { parent, replies }])
  }, [])

  const handleExitDeepReplies = useCallback(() => {
    setDeepThreadStack((prev) => prev.slice(0, -1))
  }, [])

  useEffect(() => {
    setDeepThreadStack([])
  }, [focus?.uri, viewMode])

  const currentDeepView = deepThreadStack.length > 0 ? deepThreadStack[deepThreadStack.length - 1] : null

  useEffect(() => {
    if (!currentDeepView) return
    const el = detailScrollRef.current
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
  }, [currentDeepView])

  if (!active) return null

  const formatHandle = (value) => {
    if (!value) return ''
    return value.startsWith('@') ? value : `@${value}`
  }

  const focusAuthorName = focus?.author?.displayName || focus?.author?.handle || ''
  const focusAuthorHandle = formatHandle(focus?.author?.handle || '')
  const focusAuthorDid = focus?.author?.did || '@'
  const headerTitle = focusAuthorName
    ? t('timeline.thread.titleWithName', 'Thread von {name}', { name: focusAuthorName })
    : t('timeline.thread.titleFallback', 'Thread')
  const headerSubtitle = focusAuthorHandle || focusAuthorDid
  const headerActions = (
    <>
      <Button
        variant='secondary'
        size='pill'
        disabled={!state.isAuthorThread}
        onClick={handleUnroll}
      >
        {t('timeline.thread.actions.unroll', 'Unroll')}
      </Button>
      <Button
        variant='secondary'
        size='pill'
        onClick={handleReload}
        disabled={state.loading}
      >
        {t('timeline.thread.actions.refresh', 'Aktualisieren')}
      </Button>
    </>
  )

  const showBranchPanel = viewMode === 'author' && threadViewVariant === 'planner' && branchCandidates.length > 0

  const renderFullThread = () => (
    <ThreadNodeList
      nodes={threadNodes}
      maxDepth={MAX_THREAD_DEPTH}
      highlightUri={focus?.uri}
      onReply={openReplyComposer}
      onQuote={openQuoteComposer}
      onViewMedia={openMediaPreview}
      onSelect={selectThreadFromItem}
      onOpenDeepReplies={handleOpenDeepReplies}
    />
  )

  const renderAuthorThread = () => (
    authorTimeline.length ? (
      <div className='space-y-4'>
        {authorTimeline.map((node) => {
          const key = node?.listEntryId || node?.uri || node?.cid
          const isFocus = node?.uri && node.uri === focus.uri
          return (
            <div key={key || `thread-node-${node?.createdAt || ''}`} className={isFocus ? 'rounded-2xl ring-2 ring-primary/40' : ''}>
              <SkeetItem
                item={node}
                onViewMedia={openMediaPreview}
                showActions={false}
              />
            </div>
          )
        })}
      </div>
    ) : (
      <p className='text-sm text-foreground-muted'>
        {t('timeline.thread.noAuthorPosts', 'Keine Beiträge des Autors gefunden.')}
      </p>
    )
  )

  const renderDeepThreadView = () => {
    if (!currentDeepView) return null
    const parentNode = currentDeepView.parent
    const replies = Array.isArray(currentDeepView.replies) ? currentDeepView.replies : []
    const backLabel = deepThreadStack.length > 1
      ? t('timeline.thread.depthStub.backLevel', 'Zurück zur vorherigen Ebene')
      : t('timeline.thread.depthStub.backTimeline', 'Zurück zur Thread-Ansicht')

    return (
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='secondary' size='pill' onClick={handleExitDeepReplies}>
            {backLabel}
          </Button>
          <p className='text-xs uppercase tracking-wide text-foreground-muted'>
            {t('timeline.thread.depthStub.helperTitle', 'Fortsetzung tieferer Ebenen')}
          </p>
        </div>
        <div className='rounded-2xl border border-border bg-background p-3'>
          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
            {t('timeline.thread.depthStub.parentLabel', 'Übergeordneter Beitrag')}
          </p>
          <SkeetItem
            item={parentNode}
            onReply={openReplyComposer}
            onQuote={openQuoteComposer}
            onViewMedia={openMediaPreview}
            onSelect={selectThreadFromItem}
          />
        </div>
        {replies.length === 0 ? (
          <p className='text-sm text-foreground-muted'>
            {t('timeline.thread.depthStub.empty', 'Keine weiteren Antworten.')}
          </p>
        ) : (
          <ThreadNodeList
            nodes={replies}
            highlightUri={focus?.uri}
            onReply={openReplyComposer}
            onQuote={openQuoteComposer}
            onViewMedia={openMediaPreview}
            onSelect={selectThreadFromItem}
            maxDepth={MAX_THREAD_DEPTH}
            onOpenDeepReplies={handleOpenDeepReplies}
          />
        )}
      </div>
    )
  }

  return (
    <BskyDetailPane
      header={{
        //eyebrow: 'Thread',
        title: headerTitle,
        subtitle: headerSubtitle,        
        onBack: handleClose,
        actions: headerActions
      }}
      registerLayoutHeader={registerLayoutHeader}
      renderHeaderInLayout={renderHeaderInLayout}
    >
      <div ref={detailScrollRef} className='h-full space-y-4 overflow-y-auto px-4 py-4 select-none'>
        {error ? (
          <p className='text-sm text-red-600'>{error}</p>
        ) : null}
        {!error && focus ? (
          viewMode === 'author'
            ? renderAuthorThread()
            : (currentDeepView ? renderDeepThreadView() : renderFullThread())
        ) : null}
        {showBranchPanel ? (
          <section className='mt-6 space-y-3 border-t border-border/60 pt-4'>
            <p className='text-sm font-semibold text-foreground'>
              {t('timeline.thread.branches.title', 'Verzweigungen')}
            </p>
            {branchCandidates.map((branch) => (
              <button
                key={branch.listEntryId || branch.uri || branch.cid}
                type='button'
                className='w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-left shadow-soft transition hover:border-primary/60 hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm' 
                onClick={() => selectThreadFromItem?.(branch)}
              >
                <p className='text-sm font-semibold text-foreground'>
                  {branch.author?.displayName || branch.author?.handle || t('timeline.thread.branches.unknown', 'Unbekannt')}
                </p>
                {branch.author?.handle ? (
                  <p className='text-xs text-foreground-muted'>@{branch.author.handle}</p>
                ) : null}
                {branch.snippet ? (
                  <p className='mt-2 text-sm text-foreground line-clamp-3'>{branch.snippet}</p>
                ) : (
                  <p className='mt-2 text-xs text-foreground-muted'>
                    {t('timeline.thread.branches.noText', 'Kein Text verfügbar.')}
                  </p>
                )}
              </button>
            ))}
          </section>
        ) : null}
      </div>
    </BskyDetailPane>
  )
}
