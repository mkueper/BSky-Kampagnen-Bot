import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@bsky-kampagnen-bot/shared-ui'
import { useTheme } from '../ui/ThemeContext'
import * as Tabs from '@radix-ui/react-tabs'
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ReloadIcon } from '@radix-ui/react-icons'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import PlannedSkeetList from '../PlannedSkeetList'
import PublishedSkeetList from '../PublishedSkeetList'
import DeletedSkeetList from '../DeletedSkeetList'
import { useVisibleIds } from '../../hooks/useVisibleIds'
import FloatingToolbar from '../ui/FloatingToolbar'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

/**
 * Zusammenstellung aller Dashboard-Kacheln und Listen.
 *
 * App.jsx liefert lediglich die Daten und Aktionen – das Dashboard kümmert sich
 * um Darstellung, Sortierung und kleine Interaktionen (Tabwechsel, Sortierung
 * der veröffentlichten Skeets).
 */
function DashboardView ({
  plannedSkeets,
  publishedSkeets,
  deletedSkeets,
  pendingSkeets,
  onEditSkeet,
  onDeleteSkeet,
  onRetractSkeet,
  onRestoreSkeet,
  onPermanentDeleteSkeet,
  onFetchReactions,
  onShowSkeetContent,
  onShowRepliesContent,
  activeCardTabs,
  repliesBySkeet,
  replyErrors,
  loadingReplies,
  loadingReactions,
  reactionStats,
  formatTime,
  getRepeatDescription,
  platformLabels,
  activeTab,
  onTabChange,
  highlightedSkeetId = null,
  onHighlightConsumed,
  onPublishPendingOnce,
  onDiscardPendingSkeet
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [publishedSortOrder, setPublishedSortOrder] = useState('desc')
  const { getRefForId, visibleIds } = useVisibleIds()
  const tabListViewportRef = useRef(null)
  const [tabScrollState, setTabScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false
  })

  const updateTabOverflow = useCallback(() => {
    const viewport = tabListViewportRef.current
    if (!viewport) return
    const { scrollLeft, scrollWidth, clientWidth } = viewport
    setTabScrollState({
      canScrollLeft: scrollLeft > 1,
      canScrollRight: scrollWidth - scrollLeft - clientWidth > 1
    })
  }, [])

  const scrollTabs = useCallback(direction => {
    const viewport = tabListViewportRef.current
    if (!viewport) return
    const delta = direction === 'left' ? -180 : 180
    viewport.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (activeTab !== 'published') {
      setPublishedSortOrder('desc')
    }
  }, [activeTab])

  useEffect(() => {
    const viewport = tabListViewportRef.current
    if (!viewport) return
    updateTabOverflow()
    const handleScroll = () => updateTabOverflow()
    viewport.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateTabOverflow)
    return () => {
      viewport.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateTabOverflow)
    }
  }, [updateTabOverflow])

  // Hinweis: Übersicht und Nächster Skeet werden in diesem View nicht verwendet

  const sortedPublishedSkeets = useMemo(() => {
    const items = [...publishedSkeets]
    const resolveDate = entry => {
      const candidates = [entry.postedAt, entry.scheduledAt, entry.createdAt]
      for (const value of candidates) {
        if (!value) continue
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.getTime()
        }
      }
      return 0
    }
    items.sort((a, b) => {
      const dateA = resolveDate(a)
      const dateB = resolveDate(b)
      return publishedSortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
    return items
  }, [publishedSkeets, publishedSortOrder])

  const theme = useTheme()
  const pendingDisabled = !pendingSkeets || pendingSkeets.length === 0

  useEffect(() => {
    if (!highlightedSkeetId) return
    if (activeTab !== 'planned') return
    const timer = setTimeout(() => {
      onHighlightConsumed?.()
    }, 2000)
    return () => clearTimeout(timer)
  }, [highlightedSkeetId, activeTab, onHighlightConsumed])
  return (
    <div className='space-y-4'>
      

      <section className={`rounded-3xl border border-border ${theme.panelBg} shadow-soft`}>
        <div className='flex flex-col gap-4 border-b border-border-muted px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>
              {t('posts.activity.title', 'Post-Aktivität')}
            </h3>
            <p className='text-sm text-foreground-muted'>
              {t(
                'posts.activity.description',
                'Verwalte geplante und veröffentlichte Posts inklusive Antworten & Reaktionen.'
              )}
            </p>
          </div>
          <div className='flex flex-col gap-3 text-sm font-medium sm:flex-row sm:items-center sm:gap-4'>
            <Tabs.Root
              value={activeTab}
              onValueChange={onTabChange}
              className='block w-full sm:w-auto'
            >
              <div className='relative rounded-full bg-background-subtle'>
                {tabScrollState.canScrollLeft ? (
                  <>
                    <div
                      aria-hidden='true'
                      className='pointer-events-none absolute inset-y-[6px] left-0 w-8 rounded-l-full bg-gradient-to-r from-background-subtle to-transparent'
                    />
                    <button
                      type='button'
                      className='absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background p-1 text-foreground transition hover:bg-background-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                      onClick={() => scrollTabs('left')}
                      aria-label={t('posts.activity.tabs.scrollLeft', 'Tabs nach links scrollen')}
                    >
                      <ChevronLeftIcon className='h-4 w-4' aria-hidden='true' />
                    </button>
                  </>
                ) : null}
                <div
                  ref={tabListViewportRef}
                  className='hide-scrollbar overflow-x-auto rounded-full'
                  role='presentation'
                >
                  <Tabs.List
                    className='flex min-w-max flex-nowrap items-center gap-1 px-1 py-1'
                    aria-label={t('posts.activity.tabs.ariaLabel', 'Post-Status auswählen')}
                  >
                    <Tabs.Trigger
                      value='planned'
                      className={`whitespace-nowrap rounded-full px-4 py-2 transition ${
                        activeTab === 'planned'
                          ? 'bg-background-elevated shadow-soft'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {t('posts.activity.tabs.planned', 'Geplant')}
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value='published'
                      className={`whitespace-nowrap rounded-full px-4 py-2 transition ${
                        activeTab === 'published'
                          ? 'bg-background-elevated shadow-soft'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {t('posts.activity.tabs.published', 'Veröffentlicht')}
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value='pending'
                      className={`whitespace-nowrap rounded-full px-4 py-2 transition ${
                        pendingDisabled
                          ? ''
                          : activeTab === 'pending'
                            ? 'bg-background-elevated shadow-soft'
                            : 'text-foreground-muted hover:text-foreground'
                      }`}
                      disabled={pendingDisabled}
                    >
                      {t('posts.activity.tabs.pending', 'Wartend')}
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value='deleted'
                      className={`whitespace-nowrap rounded-full px-4 py-2 transition ${
                        activeTab === 'deleted'
                          ? 'bg-background-elevated shadow-soft'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {t('posts.activity.tabs.deleted', 'Papierkorb')}
                    </Tabs.Trigger>
                  </Tabs.List>
                </div>
                {tabScrollState.canScrollRight ? (
                  <>
                    <div
                      aria-hidden='true'
                      className='pointer-events-none absolute inset-y-[6px] right-0 w-8 rounded-r-full bg-gradient-to-l from-background-subtle to-transparent'
                    />
                    <button
                      type='button'
                      className='absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background p-1 text-foreground transition hover:bg-background-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                      onClick={() => scrollTabs('right')}
                      aria-label={t('posts.activity.tabs.scrollRight', 'Tabs nach rechts scrollen')}
                    >
                      <ChevronRightIcon className='h-4 w-4' aria-hidden='true' />
                    </button>
                  </>
                ) : null}
              </div>
            </Tabs.Root>
          </div>
        </div>

        <div className='px-6 pt-6 pb-6'>
          {activeTab === 'planned' ? (
            <PlannedSkeetList
              skeets={plannedSkeets}
              onEdit={onEditSkeet}
              onDelete={onDeleteSkeet}
              getRepeatDescription={getRepeatDescription}
              highlightedId={highlightedSkeetId}
            />
          ) : activeTab === 'published' ? (
            <PublishedSkeetList
              skeets={sortedPublishedSkeets}
              activeCardTabs={activeCardTabs}
              repliesBySkeet={repliesBySkeet}
              replyErrors={replyErrors}
              loadingReplies={loadingReplies}
              loadingReactions={loadingReactions}
              onShowSkeetContent={onShowSkeetContent}
              onShowRepliesContent={onShowRepliesContent}
              onFetchReactions={onFetchReactions}
              onRetract={onRetractSkeet}
              reactionStats={reactionStats}
              platformLabels={platformLabels}
              formatTime={formatTime}
              getItemRef={getRefForId}
            />
          ) : activeTab === 'deleted' ? (
            <DeletedSkeetList
              skeets={deletedSkeets}
              onRestore={onRestoreSkeet}
              onPermanentDelete={onPermanentDeleteSkeet}
              formatTime={formatTime}
            />
          ) : (
            <PlannedSkeetList
              skeets={pendingSkeets}
              onEdit={onEditSkeet}
              onDelete={onDeleteSkeet}
              getRepeatDescription={getRepeatDescription}
              highlightedId={highlightedSkeetId}
              showPendingActions
              onPublishPendingOnce={onPublishPendingOnce}
              onDiscardPending={onDiscardPendingSkeet}
            />
          )}
        </div>
      </section>

      {activeTab === 'published' ? (
        <FloatingToolbar
          ariaLabel={t('posts.activity.toolbar.ariaLabel', 'Post-Aktionen')}
          variant='primary'
        >
          <Button
            variant='ghost'
            size='icon'
            className={`text-inherit ${
              publishedSortOrder === 'desc' ? 'bg-primary-foreground/20' : ''
            } hover:bg-primary-foreground/15`}
            onClick={() => setPublishedSortOrder('desc')}
            aria-pressed={publishedSortOrder === 'desc'}
            aria-label={t(
              'posts.activity.toolbar.sortNewFirst',
              'Neu zuerst sortieren'
            )}
            title={t('posts.activity.toolbar.sortNewFirst', 'Neu zuerst')}
          >
            <ArrowDownIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className={`text-inherit ${
              publishedSortOrder === 'asc' ? 'bg-primary-foreground/20' : ''
            } hover:bg-primary-foreground/15`}
            onClick={() => setPublishedSortOrder('asc')}
            aria-pressed={publishedSortOrder === 'asc'}
            aria-label={t(
              'posts.activity.toolbar.sortOldFirst',
              'Alt zuerst sortieren'
            )}
            title={t('posts.activity.toolbar.sortOldFirst', 'Alt zuerst')}
          >
            <ArrowUpIcon className='h-4 w-4' />
          </Button>
          <span
            role='separator'
            aria-orientation='vertical'
            className='mx-1 h-5 w-px bg-border'
          />
          <Button
            variant='ghost'
            size='icon'
            className='text-inherit hover:bg-primary-foreground/15'
            aria-label={t(
              'posts.activity.toolbar.refreshVisible',
              'Alle sichtbaren aktualisieren'
            )}
            title={t(
              'posts.activity.toolbar.refreshVisible',
              'Alle sichtbaren aktualisieren'
            )}
            onClick={async () => {
              try {
                const ids = sortedPublishedSkeets
                  .map(s => s.id)
                  .filter(id => visibleIds.includes(id))
                if (!ids.length) {
                  toast.info({
                    title: t(
                      'posts.activity.toolbar.noVisibleTitle',
                      'Keine sichtbaren Einträge'
                    ),
                    description: t(
                      'posts.activity.toolbar.noVisibleDescription',
                      'Scrolle die Liste, um Einträge sichtbar zu machen.'
                    )
                  })
                  return
                }
                const res = await fetch('/api/engagement/refresh-many', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ entity: 'skeet', ids })
                })
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}))
                  throw new Error(
                    data.error ||
                      t(
                        'posts.activity.toolbar.refreshBackendErrorFallback',
                        'Fehler beim Aktualisieren der sichtbaren Posts.'
                      )
                  )
                }
                const data = await res.json().catch(() => null)
                const total = data?.total ?? ids.length
                const okCount = Array.isArray(data?.results)
                  ? data.results.filter(r => r.ok).length
                  : 0
                const failCount = Math.max(0, total - okCount)
                toast.success({
                  title: t(
                    'posts.activity.toolbar.refreshSuccessTitle',
                    'Sichtbare aktualisiert'
                  ),
                  description: `${t(
                    'posts.activity.toolbar.refreshSuccessDescriptionPrefix',
                    'Posts: '
                  )}${okCount}${t(
                    'posts.activity.toolbar.refreshSuccessDescriptionSuffix',
                    ' aktualisiert'
                  )}${
                    failCount
                      ? t(
                          'posts.activity.toolbar.refreshSuccessFailedPart',
                          ` · ${failCount} fehlgeschlagen`,
                          { count: failCount }
                        )
                      : ''
                  }`
                })
                onTabChange('published')
              } catch (error) {
                console.error(
                  'Skeets sichtbar aktualisieren fehlgeschlagen:',
                  error
                )
                toast.error({
                  title: t(
                    'posts.activity.toolbar.refreshErrorTitle',
                    'Aktualisierung fehlgeschlagen'
                  ),
                  description:
                    error?.message ||
                    t(
                      'posts.activity.toolbar.refreshErrorDescription',
                      'Fehler beim Aktualisieren.'
                    )
                })
              }
            }}
            disabled={
              !sortedPublishedSkeets.some(s => visibleIds.includes(s.id))
            }
          >
            <ReloadIcon className='h-4 w-4' />
          </Button>
        </FloatingToolbar>
      ) : null}
    </div>
  )
}

export default DashboardView
