import { useMemo, useState } from 'react'
import { Button } from '@bsky-kampagnen-bot/shared-ui'
import { useTheme } from '../ui/ThemeContext'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import * as Tabs from '@radix-ui/react-tabs'
import { ArrowDownIcon, ArrowUpIcon, ReloadIcon } from '@radix-ui/react-icons'
import ThreadOverview from '../ThreadOverview'
import { useVisibleIds } from '../../hooks/useVisibleIds'
import FloatingToolbar from '../ui/FloatingToolbar'

function ThreadDashboardView ({
  threads,
  loading,
  error,
  onReload,
  onEditThread,
  onDeleteThread,
  onRestoreThread,
  onDestroyThread,
  onRetractThread
}) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('planned')
  const [bulkRefreshing, setBulkRefreshing] = useState(false)
  const [bulkIncludeReplies, setBulkIncludeReplies] = useState(false)
  const { getRefForId, visibleIds } = useVisibleIds()

  const plannedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : []
    return items.filter(
      thread =>
        thread.status !== 'deleted' &&
        (thread.status === 'scheduled' || thread.status === 'draft')
    )
  }, [threads])

  const [publishedSortOrder, setPublishedSortOrder] = useState('desc')
  const publishedThreads = useMemo(() => {
    const items = (Array.isArray(threads) ? threads : []).filter(
      t => t.status === 'published'
    )
    const resolvePublishedTime = thread => {
      const meta = thread?.metadata || {}
      // Bevorzugt lastSuccessAt, sonst lastDispatchAt, dann erstes Segment.postedAt, fallback updatedAt
      const candidates = [
        meta.lastSuccessAt,
        meta.lastDispatchAt,
        thread?.segments?.[0]?.postedAt,
        thread?.updatedAt
      ]
      for (const value of candidates) {
        if (!value) continue
        const d = new Date(value)
        if (!Number.isNaN(d.getTime())) return d.getTime()
      }
      return 0
    }
    items.sort((a, b) => {
      const ta = resolvePublishedTime(a)
      const tb = resolvePublishedTime(b)
      return publishedSortOrder === 'asc' ? ta - tb : tb - ta
    })
    return items
  }, [threads, publishedSortOrder])

  const trashedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : []
    return items.filter(thread => thread.status === 'deleted')
  }, [threads])

  // Hinweis: Zusammenfassungs- und Nächster-Thread-Anzeigen sind hier nicht aktiv

  const theme = useTheme()
  return (
    <div className='space-y-4'>
      

      <section className={`rounded-3xl border border-border ${theme.panelBg} shadow-soft`}>
        <div className='flex flex-col gap-4 border-b border-border-muted px-6 py-5 md:flex-row md:items-center md:justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>Thread Aktivität</h3>
            <p className='text-sm text-foreground-muted'>
              Verwalte geplante und veröffentlichte Threads inklusive Antworten
              &amp; Reaktionen.
            </p>
          </div>
          <div className='flex flex-col gap-3 text-sm font-medium md:flex-row md:items-center md:gap-3'>
            <Tabs.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className='inline-flex rounded-full bg-background-subtle p-1'
            >
              <Tabs.List
                className='flex'
                role='tablist'
                aria-orientation='horizontal'
              >
                {[
                  { value: 'planned', label: 'Geplant' },
                  { value: 'published', label: 'Veröffentlicht' },
                  { value: 'deleted', label: 'Papierkorb' }
                ].map(({ value, label }) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className={`rounded-full px-4 py-2 transition ${
                      activeTab === value
                        ? 'bg-background-elevated shadow-soft'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs.Root>
            {activeTab === 'published' ? (
            <div className='self-start flex items-center gap-2 rounded-full border border-border bg-background-subtle px-2 py-1 text-xs font-medium text-foreground-muted md:hidden'>
                <span className='sr-only'>
                  Sortierung veröffentlichter Threads
                </span>
                <div className='flex items-center gap-1'>
                  <Button
                    variant={
                      publishedSortOrder === 'desc' ? 'secondary' : 'ghost'
                    }
                    size='icon'
                    onClick={() => setPublishedSortOrder('desc')}
                    aria-pressed={publishedSortOrder === 'desc'}
                    title='Neu zuerst'
                  >
                    <ArrowDownIcon className='h-4 w-4' />
                  </Button>
                  <Button
                    variant={
                      publishedSortOrder === 'asc' ? 'secondary' : 'ghost'
                    }
                    size='icon'
                    onClick={() => setPublishedSortOrder('asc')}
                    aria-pressed={publishedSortOrder === 'asc'}
                    title='Alt zuerst'
                  >
                    <ArrowUpIcon className='h-4 w-4' />
                  </Button>
                </div>
                <span
                  role='separator'
                  aria-orientation='vertical'
                  className='mx-1 h-5 w-px bg-border'
                />
                <div className='flex items-center gap-2'>
                  <label className='inline-flex cursor-pointer items-center gap-2 text-foreground-muted'>
                    <input
                      type='checkbox'
                      className='h-3.5 w-3.5 rounded border-border'
                      checked={bulkIncludeReplies}
                      disabled={bulkRefreshing}
                      onChange={e =>
                        setBulkIncludeReplies(Boolean(e.target.checked))
                      }
                    />
                    <span className='text-xs'>Antworten</span>
                  </label>
                <div className='hidden md:flex'>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label='Alle sichtbaren aktualisieren'
                    title='Alle sichtbaren aktualisieren'
                    onClick={async () => {
                        setBulkRefreshing(true)
                        try {
                          const ids = threads
                            .filter(t => t.status === 'published')
                            .map(t => t.id)
                            .filter(id => visibleIds.includes(id))
                          if (!ids.length) {
                            toast.info({
                              title: 'Keine sichtbaren Einträge',
                              description:
                                'Scrolle die Liste, um Einträge sichtbar zu machen.'
                            })
                          } else {
                            const res = await fetch(
                              '/api/engagement/refresh-many',
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  entity: 'thread',
                                  ids,
                                  includeReplies: Boolean(bulkIncludeReplies)
                                })
                              }
                            )
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}))
                              throw new Error(
                                data.error ||
                                  'Fehler beim Aktualisieren der sichtbaren Threads.'
                              )
                            }
                            const data = await res.json().catch(() => null)
                            const total = data?.total ?? ids.length
                            const okCount = Array.isArray(data?.results)
                              ? data.results.filter(r => r.ok).length
                              : 0
                            const failCount = Math.max(0, total - okCount)
                            toast.success({
                              title: 'Sichtbare aktualisiert',
                              description: `Threads: ${okCount} aktualisiert${
                                failCount ? ` · ${failCount} fehlgeschlagen` : ''
                              }`
                            })
                            if (typeof onReload === 'function')
                              onReload({ force: true })
                          }
                        } catch (error) {
                          console.error(
                            'Bulk-Refresh (sichtbar) fehlgeschlagen:',
                            error
                          )
                          toast.error({
                            title: 'Aktualisierung fehlgeschlagen',
                            description:
                              error?.message || 'Fehler beim Aktualisieren.'
                          })
                        } finally {
                          setBulkRefreshing(false)
                        }
                      }}
                      disabled={
                        bulkRefreshing ||
                        !threads.some(
                          t =>
                            t.status === 'published' && visibleIds.includes(t.id)
                        )
                      }
                    >
                      <ReloadIcon className='h-4 w-4' />
                    </Button>
                </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='px-6 pt-6 pb-6'>
          {activeTab === 'planned' ? (
            <ThreadOverview
              threads={plannedThreads}
              loading={loading}
              error={error}
              onReload={onReload}
              onEditThread={onEditThread}
              onDeleteThread={onDeleteThread}
              onRetractThread={onRetractThread}
              mode='default'
              getItemRef={getRefForId}
            />
          ) : activeTab === 'published' ? (
            <ThreadOverview
              threads={publishedThreads}
              loading={loading}
              error={error}
              onReload={onReload}
              onEditThread={onEditThread}
              onDeleteThread={onDeleteThread}
              onRetractThread={onRetractThread}
              mode='default'
              getItemRef={getRefForId}
            />
          ) : trashedThreads.length > 0 ? (
            <ThreadOverview
              threads={trashedThreads}
              loading={loading}
              error={error}
              onReload={onReload}
              onRestoreThread={onRestoreThread}
              onDestroyThread={onDestroyThread}
              mode='deleted'
              getItemRef={getRefForId}
            />
          ) : (
            <p className='rounded-3xl border border-border bg-background-subtle px-4 py-6 text-sm text-foreground-muted'>
              Der Papierkorb ist leer.
            </p>
          )}
        </div>
      </section>

      {activeTab === 'published' ? (
        <FloatingToolbar ariaLabel='Thread-Aktionen' variant='primary' className='hidden md:flex'>
          <Button
            variant='ghost'
            size='icon'
            className={`text-inherit ${
              publishedSortOrder === 'desc' ? 'bg-primary-foreground/20' : ''
            } hover:bg-primary-foreground/15`}
            onClick={() => setPublishedSortOrder('desc')}
            aria-pressed={publishedSortOrder === 'desc'}
            aria-label='Neu zuerst sortieren'
            title='Neu zuerst'
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
            aria-label='Alt zuerst sortieren'
            title='Alt zuerst'
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
            aria-label='Alle sichtbaren aktualisieren'
            title='Alle sichtbaren aktualisieren'
            onClick={async () => {
              setBulkRefreshing(true)
              try {
                const ids = threads
                  .filter(t => t.status === 'published')
                  .map(t => t.id)
                  .filter(id => visibleIds.includes(id))
                if (!ids.length) {
                  toast.info({
                    title: 'Keine sichtbaren Einträge',
                    description:
                      'Scrolle die Liste, um Einträge sichtbar zu machen.'
                  })
                } else {
                  const res = await fetch('/api/engagement/refresh-many', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      entity: 'thread',
                      ids,
                      includeReplies: Boolean(bulkIncludeReplies)
                    })
                  })
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    throw new Error(
                      data.error ||
                        'Fehler beim Aktualisieren der sichtbaren Threads.'
                    )
                  }
                  const data = await res.json().catch(() => null)
                  const total = data?.total ?? ids.length
                  const okCount = Array.isArray(data?.results)
                    ? data.results.filter(r => r.ok).length
                    : 0
                  const failCount = Math.max(0, total - okCount)
                  toast.success({
                    title: 'Sichtbare aktualisiert',
                    description: `Threads: ${okCount} aktualisiert${
                      failCount ? ` · ${failCount} fehlgeschlagen` : ''
                    }`
                  })
                  if (typeof onReload === 'function') onReload({ force: true })
                }
              } catch (error) {
                console.error('Bulk-Refresh (sichtbar) fehlgeschlagen:', error)
                toast.error({
                  title: 'Aktualisierung fehlgeschlagen',
                  description: error?.message || 'Fehler beim Aktualisieren.'
                })
              } finally {
                setBulkRefreshing(false)
              }
            }}
            disabled={
              bulkRefreshing ||
              !threads.some(
                t => t.status === 'published' && visibleIds.includes(t.id)
              )
            }
          >
            <ReloadIcon className='h-4 w-4' />
          </Button>
        </FloatingToolbar>
      ) : null}
    </div>
  )
}

export default ThreadDashboardView
