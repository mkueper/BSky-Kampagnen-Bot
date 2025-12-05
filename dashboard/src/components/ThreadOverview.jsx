import { useCallback, useState } from 'react'
import { Button, Card } from '@bsky-kampagnen-bot/shared-ui'
import { useTheme } from './ui/ThemeContext'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import { useVirtualList } from '../hooks/useVirtualList'
import { useTranslation } from '../i18n/I18nProvider.jsx'
const PLATFORM_LABELS = { bluesky: 'Bluesky', mastodon: 'Mastodon' }

function parseThreadMetadata (thread) {
  const raw = thread?.metadata
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (error) {
      console.warn('Konnte Thread-Metadaten nicht parsen:', error)
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw
  }
  return {}
}

function resolvePublishedDate (thread) {
  const metadata = parseThreadMetadata(thread)
  const candidates = [
    metadata.lastSuccessAt,
    metadata.lastDispatchAt,
    thread?.updatedAt
  ]

  if (Array.isArray(thread?.segments)) {
    const segmentDate = thread.segments.find(
      segment => segment?.postedAt
    )?.postedAt
    candidates.unshift(segmentDate)
  }

  for (const value of candidates) {
    if (!value) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }
  return null
}

function formatScheduledLabel (thread) {
  if (thread?.status === 'published') {
    const publishedDate = resolvePublishedDate(thread)
    if (publishedDate) {
      return { type: 'publishedAt', date: publishedDate }
    }
    return { type: 'published' }
  }

  if (!thread?.scheduledAt) {
    return { type: 'noSchedule' }
  }

  const date = new Date(thread.scheduledAt)
  if (Number.isNaN(date.getTime())) {
    return { type: 'invalid', raw: thread.scheduledAt }
  }

  if (thread.status === 'scheduled') {
    return { type: 'scheduledAt', date }
  }

  return { type: 'scheduledFor', date }
}

function ThreadOverview ({
  threads,
  loading,
  error,
  onReload,
  onEditThread,
  onDeleteThread,
  onRestoreThread,
  onDestroyThread,
  onRetractThread,
  mode = 'default',
  getItemRef
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [expandedThreads, setExpandedThreads] = useState({})
  const [showReplies, setShowReplies] = useState({})
  const [loadingRefresh, setLoadingRefresh] = useState({})
  const toast = useToast()
  const resolvedThreads = Array.isArray(threads) ? threads : []
  const shouldVirtualize = resolvedThreads.length > 25
  const scrollParentSelector = useCallback(() => {
    if (typeof document === 'undefined') return null
    return document.getElementById('app-scroll-container')
  }, [])
  const { isReady: virtualReady, virtualItems, totalSize, measureRef } = useVirtualList({
    itemCount: resolvedThreads.length,
    estimateSize: 520,
    overscan: 6,
    enabled: shouldVirtualize,
    getScrollElement: scrollParentSelector
  })
  const getCombinedRef = useCallback(
    (virtualIndex, threadId) => {
      const measure = measureRef(virtualIndex)
      const visibleRef =
        typeof getItemRef === 'function' ? getItemRef(threadId) : null
      return node => {
        measure?.(node)
        if (visibleRef) visibleRef(node)
      }
    },
    [getItemRef, measureRef]
  )

  const handleToggle = threadId => {
    setExpandedThreads(current => ({
      ...current,
      [threadId]: !current[threadId]
    }))
  }

  if (loading) {
    return (
      <section className={`rounded-3xl border border-border ${theme.panelBg} p-6 shadow-soft`}>
        <p className='text-sm text-foreground-muted'>
          {t('threads.overview.loading', 'Threads werden geladen…')}
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section className='rounded-3xl border border-destructive/50 bg-destructive/10 p-6 shadow-soft'>
        <header className='mb-3 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-destructive'>
            {t(
              'threads.overview.loadErrorTitle',
              'Threads konnten nicht geladen werden'
            )}
          </h3>
          <button
            type='button'
            className='text-sm underline disabled:cursor-not-allowed disabled:opacity-60'
            onClick={() =>
              typeof onReload === 'function' ? onReload() : undefined
            }
            disabled={typeof onReload !== 'function'}
          >
            {t('threads.overview.loadErrorRetry', 'Erneut versuchen')}
          </button>
        </header>
        <p className='text-sm text-destructive'>
          {error?.message ||
            t('threads.overview.loadErrorFallback', 'Unbekannter Fehler')}
        </p>
      </section>
    )
  }

  if (!threads || threads.length === 0) {
    return (
      <section className={`rounded-3xl border border-border ${theme.panelBg} p-6 text-center shadow-soft`}>
        <h3 className='text-lg font-semibold'>
          {t(
            'threads.overview.emptyTitle',
            'Noch keine Threads gespeichert'
          )}
        </h3>
        <p className='mt-2 text-sm text-foreground-muted'>
          {t(
            'threads.overview.emptyBody',
            'Lege im Thread-Editor einen Thread an, um hier eine Vorschau zu sehen.'
          )}
        </p>
      </section>
    )
  }

  const renderThreadCard = (thread, refOverride) => {
        const segments = Array.isArray(thread.segments) ? thread.segments : []
        const firstSegment = segments[0] || {
          content: '',
          characterCount: 0,
          sequence: 0
        }
        const hasMore = segments.length > 1
        const isExpanded = Boolean(expandedThreads[thread.id])
        const isDeletedMode = mode === 'deleted'
        const metadata = parseThreadMetadata(thread)
        const platformResults =
          metadata.platformResults &&
          typeof metadata.platformResults === 'object'
            ? metadata.platformResults
            : {}
        const hasSentPlatforms = Object.values(platformResults).some(
          entry => entry && entry.status === 'sent'
        )
        const isDemo = (() => {
          try {
            // Demo-Kennzeichen: Segment-Flags oder demo:// IDs
            const anyDemoInPR = Object.values(platformResults).some(entry => {
              if (!entry || typeof entry !== 'object') return false
              if (entry.demo === true) return true
              const segs = Array.isArray(entry.segments) ? entry.segments : []
              return segs.some(s => s && s.demo === true)
            })
            const segDemoId =
              Array.isArray(segments) &&
              segments.some(
                seg =>
                  typeof seg?.remoteId === 'string' &&
                  seg.remoteId.startsWith('demo://')
              )
            return Boolean(anyDemoInPR || segDemoId)
          } catch {
            return false
          }
        })()
        const canRetract =
          !isDeletedMode &&
          !isDemo &&
          typeof onRetractThread === 'function' &&
          (thread.status === 'published' || hasSentPlatforms)
        const canEdit =
          !isDeletedMode &&
          typeof onEditThread === 'function' &&
          thread.status !== 'published'

        // Aggregierte Reaktionen (Replies aus DB; Likes/Reposts bevorzugt aus Metadata-Totals)
        const reactionTotals = (() => {
          const acc = { replies: 0, likes: 0, reposts: 0, quotes: 0 }
          for (const seg of segments) {
            const reactions = Array.isArray(seg?.reactions) ? seg.reactions : []
            for (const r of reactions) {
              const t = String(r?.type || '').toLowerCase()
              if (t === 'reply') acc.replies++
              else if (t === 'like') acc.likes++
              else if (t === 'repost') acc.reposts++
              else if (t === 'quote') acc.quotes++
            }
          }
          return acc
        })()

        const metadataTotals = (() => {
          const total = { likes: 0, reposts: 0, replies: 0 }
          const allowed = Array.isArray(thread.targetPlatforms) ? thread.targetPlatforms.map(String) : []
          try {
            Object.entries(platformResults).forEach(([platformId, entry]) => {
              const t = entry?.totals || {}
              if (allowed.length && !allowed.includes(platformId)) return
              if (String(entry?.status || '').toLowerCase() !== 'sent') return
              total.likes += Number(t.likes) || 0
              total.reposts += Number(t.reposts) || 0
              total.replies += Number(t.replies) || 0
            })
          } catch (e) {
            console.error(
              'Fehler bei der Verarbeitung von Metadaten-Summen:',
              e
            )
          }
          return total
        })()

        const displayLikes = metadataTotals.likes ?? reactionTotals.likes
        const displayReposts = metadataTotals.reposts ?? reactionTotals.reposts
        const displayReplies = metadataTotals.replies ?? reactionTotals.replies
        // const displayReplies = Math.max(
        //   reactionTotals.replies,
        //   metadataTotals.replies
        // )

        const perPlatformTotals = (() => {
          const out = []
          const allowed = Array.isArray(thread.targetPlatforms) ? thread.targetPlatforms.map(String) : []
          try {
            Object.entries(platformResults).forEach(([platformId, entry]) => {
              if (!entry || typeof entry !== 'object') return
              if (allowed.length && !allowed.includes(platformId)) return
              if (String(entry?.status || '').toLowerCase() !== 'sent') return
              const t = entry.totals || {}
              const likes = Number(t.likes) || 0
              const reposts = Number(t.reposts) || 0
              out.push({ platformId, likes, reposts })
            })
          } catch (e) {
            console.error('Fehler bei der Verarbeitung von Platform-Summen:', e)
          }
          return out
        })()

        const flatReplies = (() => {
          const out = []
          for (const seg of segments) {
            const seq = Number(seg?.sequence) //?? 0
            const reactions = Array.isArray(seg?.reactions) ? seg.reactions : []
            for (const r of reactions) {
              if (String(r?.type).toLowerCase() === 'reply') {
                out.push({
                  sequence: seq,
                  author: r.authorHandle || r.authorDisplayName || 'Unbekannt',
                  content: r.content || ''
                })
              }
            }
          }
          return out
        })()

        // Ermittele das jüngste metricsUpdatedAt für das erste Segment (sequence)
        const firstSeq = Number(firstSegment.sequence) || 0
        const lastMetricsUpdatedAt = (() => {
          let latest = 0
          try {
            Object.values(platformResults).forEach(entry => {
              if (!entry || typeof entry !== 'object') return
              const segs = Array.isArray(entry.segments) ? entry.segments : []
              const seg = segs.find(s => Number(s?.sequence) === firstSeq)
              const ts = seg?.metricsUpdatedAt ?? entry.metricsUpdatedAt
              if (!ts) return
              const t = new Date(ts).getTime()
              if (Number.isFinite(t) && t > latest) latest = t
            })
          } catch (e) {
            console.error(
              'Fehler bei der Ermittlung des letzten Metrik-Updates:',
              e
            )
          }
          return latest > 0 ? new Date(latest) : null
        })()

        const formatUpdatedAt = date => {
          if (!date) return null
          try {
            return new Intl.DateTimeFormat('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }).format(date)
          } catch (e) {
            console.error('Fehler beim Formatieren des Update Datums:', e)
            return null
          }
        }

        const refProp =
          refOverride ||
          (typeof getItemRef === 'function' ? getItemRef(thread.id) : undefined)

        return (
          <Card
            key={thread.id}
            id={`thread-${thread.id}`}
            ref={refProp}
          >
            <header className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h3 className='text-lg font-semibold text-foreground'>
                  {thread.title || `Thread #${thread.id}`}
                </h3>
                <p className='text-sm text-foreground-muted'>
                  {(() => {
                    const info = formatScheduledLabel(thread)
                    if (!info) return null
                    const formatter = new Intl.DateTimeFormat('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    if (info.type === 'publishedAt') {
                      return `${t(
                        'threads.card.publishedAtPrefix',
                        'Veröffentlicht am: '
                      )}${formatter.format(info.date)}`
                    }
                    if (info.type === 'published') {
                      return t(
                        'threads.card.publishedFallback',
                        'Veröffentlicht'
                      )
                    }
                    if (info.type === 'noSchedule') {
                      return t(
                        'threads.card.noSchedule',
                        'Kein Termin geplant'
                      )
                    }
                    if (info.type === 'invalid') {
                      return `${t(
                        'threads.card.scheduledInvalidPrefix',
                        'Geplant für '
                      )}${info.raw}`
                    }
                    if (info.type === 'scheduledAt') {
                      return `${t(
                        'threads.card.scheduledAtPrefix',
                        'Wird gepostet um: '
                      )}${formatter.format(info.date)}`
                    }
                    if (info.type === 'scheduledFor') {
                      return `${t(
                        'threads.card.scheduledForPrefix',
                        'Geplant für: '
                      )}${formatter.format(info.date)}`
                    }
                    return null
                  })()}
                </p>
              </div>
              <div className='flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                {Array.isArray(thread.targetPlatforms) &&
                thread.targetPlatforms.length
                  ? thread.targetPlatforms.join(' · ')
                  : t('threads.card.noPlatforms', 'Keine Plattformen')}
              </div>
            </header>

            <div className='mt-4 space-y-3 text-sm'>
              <div className='rounded-2xl border border-border bg-background-subtle p-4'>
                <header className='mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                  <span>
                    {t('threads.card.postLabel', 'Post {index}', { index: 1 })}
                  </span>
                  <span>
                    {firstSegment.characterCount}
                    {t('threads.card.charactersSuffix', ' Zeichen')}
                  </span>
                </header>{' '}
                <p className='whitespace-pre-wrap text-foreground'>
                  {firstSegment.content || '(leer)'}
                </p>
                {Array.isArray(firstSegment.media) &&
                firstSegment.media.length > 0 ? (
                  <div className='mt-3 grid grid-cols-2 gap-2'>
                    {firstSegment.media.slice(0, 4).map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className='relative h-28 overflow-hidden rounded-xl border border-border bg-background-subtle/70'
                      >
                        <img
                          src={m.previewUrl || ''}
                          alt={m.altText || `Bild ${idx + 1}`}
                          className='absolute inset-0 h-full w-full object-contain'
                          loading='lazy'
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
                  {(thread.status === 'published' || hasSentPlatforms) ? (
                    <div className='flex flex-wrap items-center gap-3 text-xs text-foreground-muted'>
                      <span>
                        Likes:{' '}
                        <span className='font-medium text-foreground'>
                          {displayLikes}
                        </span>
                      </span>
                      <span>
                        Reposts:{' '}
                        <span className='font-medium text-foreground'>
                          {displayReposts}
                        </span>
                      </span>
                      <span>
                        Antworten:{' '}
                        <span className='font-medium text-foreground'>
                          {displayReplies}
                        </span>
                      </span>
                      {lastMetricsUpdatedAt ? (
                        <span className='inline-flex items-center gap-1'>
                          <span>·</span>
                          <span>
                            {t(
                              'threads.card.metricsUpdatedAtPrefix',
                              'Kennzahlen aktualisiert am: '
                            )}
                            <span className='font-medium text-foreground'>
                              {formatUpdatedAt(lastMetricsUpdatedAt)}
                            </span>
                          </span>
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                      {t('threads.card.plannedBadge', 'Geplant')}
                    </span>
                  )}
                  {hasMore ? (
                    <button
                      type='button'
                      onClick={() => handleToggle(thread.id)}
                      className='text-sm font-medium text-primary transition hover:underline'
                    >
                      {isExpanded
                        ? t(
                            'threads.card.hideMorePosts',
                            'Weitere Posts verbergen'
                          )
                        : t(
                            'threads.card.showMorePosts',
                            'Weitere Posts anzeigen'
                          )}
                    </button>
                  ) : (
                    <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                      {t(
                        'threads.card.noMorePosts',
                        'Keine weiteren Posts'
                      )}
                    </span>
                  )}
                  <div className='flex flex-wrap items-center gap-2'>
                    {isDeletedMode ? (
                      <>
                        <Button
                          variant='primary'
                          onClick={() => onRestoreThread?.(thread)}
                        >
                          {t('threads.card.restore', 'Reaktivieren')}
                        </Button>
                        <Button
                          variant='destructive'
                          onClick={() => onDestroyThread?.(thread)}
                        >
                          {t('threads.card.destroy', 'Endgültig löschen')}
                        </Button>
                      </>
                    ) : (
                      <>
                        {(thread.status === 'published' || hasSentPlatforms) && flatReplies.length > 0 ? (
                          <Button
                            variant='secondary'
                            onClick={() =>
                              setShowReplies(c => ({
                                ...c,
                                [thread.id]: !c[thread.id]
                              }))
                            }
                          >
                            {showReplies[thread.id]
                              ? 'Antworten verbergen'
                              : `Antworten anzeigen (${flatReplies.length})`}
                          </Button>
                        ) : null}
                        {!isDemo && (thread.status === 'published' || hasSentPlatforms) && (
                          <Button
                            variant='primary'
                            onClick={async () => {
                              setLoadingRefresh(s => ({
                                ...s,
                                [thread.id]: true
                              }))
                              try {
                                const res = await fetch(
                                  `/api/threads/${thread.id}/engagement/refresh`,
                                  { method: 'POST' }
                                )
                                if (!res.ok) {
                                  const data = await res
                                    .json()
                                    .catch(() => ({}))
                                  throw new Error(
                                    data.error ||
                                      'Fehler beim Aktualisieren der Reaktionen.'
                                  )
                                }
                                const data = await res.json().catch(() => null)
                              if (data && data.totals) {
                                  const {
                                    likes = 0,
                                    reposts = 0,
                                    replies = 0
                                  } = data.totals || {}
                                  toast.success({
                                    title: t(
                                      'threads.card.refreshSuccessTitle',
                                      'Reaktionen aktualisiert'
                                    ),
                                    description: t(
                                      'threads.card.refreshSuccessDescription',
                                      'Likes {likes} · Reposts {reposts} · Antworten {replies}',
                                      { likes, reposts, replies }
                                    )
                                  })
                                } else {
                                  toast.success({
                                    title: t(
                                      'threads.card.refreshSuccessTitle',
                                      'Reaktionen aktualisiert'
                                    ),
                                    description: t(
                                      'threads.card.refreshSuccessFallback',
                                      'Kennzahlen wurden neu geladen.'
                                    )
                                  })
                                }
                                if (typeof onReload === 'function') onReload()
                              } catch (e) {
                                console.error(
                                  'Engagement-Refresh fehlgeschlagen:',
                                  e
                                )
                                toast.error({
                                  title: t(
                                    'threads.card.refreshErrorTitle',
                                    'Aktualisierung fehlgeschlagen'
                                  ),
                                  description:
                                    e?.message ||
                                    t(
                                      'threads.card.refreshErrorDescription',
                                      'Fehler beim Aktualisieren der Reaktionen.'
                                    )
                                })
                              } finally {
                                setLoadingRefresh(s => ({
                                  ...s,
                                  [thread.id]: false
                                }))
                              }
                            }}
                            disabled={Boolean(loadingRefresh[thread.id])}
                          >
                            {loadingRefresh[thread.id]
                              ? t('threads.card.refreshLoading', 'Lädt…')
                              : t(
                                  'threads.card.refreshButton',
                                  'Reaktionen aktualisieren'
                                )}
                          </Button>
                        )}
                        {canEdit ? (
                          <Button
                            variant='secondary'
                            onClick={() => onEditThread?.(thread)}
                          >
                            {t('threads.card.edit', 'Bearbeiten')}
                          </Button>
                        ) : null}
                        {canRetract ? (
                          <Button
                            variant='warning'
                            onClick={() => onRetractThread?.(thread)}
                          >
                            {t('threads.card.retract', 'Zurückziehen')}
                          </Button>
                        ) : null}
                        <Button
                          variant='destructive'
                          onClick={() => onDeleteThread?.(thread)}
                        >
                          {t('threads.card.delete', 'Löschen')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
               {perPlatformTotals.length > 0 ? (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    {perPlatformTotals.map(p => (
                      <div
                        key={p.platformId}
                        className='rounded-2xl border border-border bg-background-subtle/80 p-4 text-sm'
                      >
                        <p className='font-medium text-foreground'>
                          {PLATFORM_LABELS[p.platformId] || p.platformId}
                        </p>
                        <p className='mt-1 text-foreground-muted'>
                          {t(
                            'threads.card.perPlatformLine',
                            'Likes {likes} · Reposts {reposts}',
                            { likes: p.likes, reposts: p.reposts }
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {showReplies[thread.id] && flatReplies.length > 0 ? (
                <div className='rounded-2xl border border-border-muted bg-background-subtle/60 p-4'>
                  <header className='mb-3 text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                    {t(
                      'threads.card.repliesHeader',
                      'Antworten (neueste zuerst)'
                    )}
                  </header>
                  <ul className='space-y-2'>
                    {flatReplies
                      .slice()
                      .reverse()
                      .map((r, idx) => (
                        <li
                          key={`${r.sequence}-${idx}`}
                          className='rounded-xl border border-border bg-background p-3'
                        >
                          <div className='mb-1 text-xs text-foreground-muted'>
                            {t(
                              'threads.card.replyPostLabel',
                              'Post {index}',
                              { index: r.sequence + 1 }
                            )}
                          </div>
                          <div className='text-sm'>
                            <span className='font-medium'>{r.author}</span>:{' '}
                            {r.content}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              {isExpanded && hasMore ? (
                <div className='space-y-2 border-l border-border-muted pl-4 sm:pl-6'>
                  {segments.slice(1).map(segment => (
                    <div
                      key={segment.id ?? segment.sequence}
                      className='rounded-2xl border border-border bg-background-subtle/60 p-3'
                    >
                      <header className='mb-1 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                        <span>Post {segment.sequence + 1}</span>
                        <span>{segment.characterCount} Zeichen</span>
                      </header>
                      <p className='whitespace-pre-wrap text-foreground'>
                        {segment.content}
                      </p>
                      {Array.isArray(segment.media) &&
                      segment.media.length > 0 ? (
                        <div className='mt-2 grid grid-cols-2 gap-2'>
                          {segment.media.slice(0, 4).map((m, idx) => (
                            <div
                              key={m.id || idx}
                              className='relative h-24 overflow-hidden rounded-xl border border-border bg-background-subtle'
                            >
                              <img
                                src={m.previewUrl || ''}
                                alt={m.altText || `Bild ${idx + 1}`}
                                className='absolute inset-0 h-full w-full object-contain'
                                loading='lazy'
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        )
  }

  if (!shouldVirtualize || !virtualReady) {
    return (
      <section className='space-y-4'>
        {resolvedThreads.map(thread => renderThreadCard(thread))}
      </section>
    )
  }

  return (
    <section
      className='relative'
      style={{ height: `${Math.max(totalSize, 1)}px` }}
    >
      {virtualItems.map(virtualItem => {
        const thread = resolvedThreads[virtualItem.index]
        if (!thread) return null
        const combinedRef = getCombinedRef(virtualItem.index, thread.id)
        return (
          <div
            key={thread.id}
            className='absolute left-0 right-0 pb-4'
            style={{ top: `${virtualItem.start}px` }}
          >
            {renderThreadCard(thread, combinedRef)}
          </div>
        )
      })}
    </section>
  )
}

export default ThreadOverview
