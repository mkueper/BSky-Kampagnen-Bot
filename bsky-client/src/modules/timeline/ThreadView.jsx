import { useCallback, useMemo } from 'react'
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

function ThreadNodeList ({
  nodes = [],
  depth = 0,
  highlightUri,
  onReply,
  onQuote,
  onViewMedia,
  onSelect
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null

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
                <ThreadNodeList
                  nodes={node.replies}
                  depth={depth + 1}
                  highlightUri={highlightUri}
                  onReply={onReply}
                  onQuote={onQuote}
                  onViewMedia={onViewMedia}
                  onSelect={onSelect}
                />
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

  if (!active) return null

  const handleClose = useCallback(() => {
    closeThread({ force: true })
  }, [closeThread])

  const handleReload = useCallback(() => {
    reloadThread()
  }, [reloadThread])

  const handleUnroll = useCallback(() => {
    if (!state.isAuthorThread) return
    dispatch({ type: 'OPEN_THREAD_UNROLL' })
  }, [dispatch, state.isAuthorThread])

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
      highlightUri={focus?.uri}
      onReply={openReplyComposer}
      onQuote={openQuoteComposer}
      onViewMedia={openMediaPreview}
      onSelect={selectThreadFromItem}
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
      <div className='h-full space-y-4 overflow-y-auto px-4 py-4 select-none'>
        {error ? (
          <p className='text-sm text-red-600'>{error}</p>
        ) : null}
        {!error && focus ? (
          viewMode === 'author'
            ? renderAuthorThread()
            : renderFullThread()
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
                className='w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-left shadow-soft transition hover:border-primary/60 hover:bg-background-subtle'
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
