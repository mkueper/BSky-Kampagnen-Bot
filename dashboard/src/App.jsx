// Zentrale Einstiegskomponente für das Dashboard. Kümmert sich um Navigation,
// Datenabfragen, Themenverwaltung sowie das Einbinden der verschiedenen Views.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, lazy } from 'react'
import {
  DownloadIcon,
  GearIcon,
  LayersIcon,
  MoonIcon,
  Pencil2Icon,
  ShadowIcon,
  SunIcon,
  UploadIcon,
  ViewHorizontalIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons'
import { Button, Card } from '@bsky-kampagnen-bot/shared-ui'
import AppLayout from './components/layout/AppLayout'
import { ThemeProvider } from './components/ui/ThemeContext'
import { useClientConfig } from './hooks/useClientConfig'
import SummaryCard from './components/ui/SummaryCard'
import ActivityPanel from './components/ui/ActivityPanel'
import ConfirmDialog from './components/ui/ConfirmDialog'
import { useSkeets } from './hooks/useSkeets'
import { useThreadDetail, useThreads } from './hooks/useThreads'
import { useSse } from './hooks/useSse'
import { formatTime } from './utils/formatTime'
import { getRepeatDescription } from './utils/timeUtils'
import { useToast } from './hooks/useToast'
import { useViewState } from './hooks/useViewState'
import { useThemeMode } from './hooks/useThemeMode'
import { useImportExport } from './hooks/useImportExport'
import { useConfirmDialog } from './hooks/useConfirmDialog'
import { useSkeetActions } from './hooks/useSkeetActions'
import { useThreadActions } from './hooks/useThreadActions'

// UI-Beschriftungen für Plattform-Kürzel – wird an mehreren Stellen benötigt.
const PLATFORM_LABELS = {
  bluesky: 'Bluesky',
  mastodon: 'Mastodon'
}

// Seitenstruktur für die linke Navigation. Hier steht, welche Tabs angezeigt
// werden und unter welchen IDs sie später adressiert werden.
const NAV_ITEMS = [
  { id: 'overview', label: 'Übersicht', icon: ViewHorizontalIcon },
  {
    id: 'skeets',
    label: 'Skeets',
    icon: Pencil2Icon,
    children: [
      { id: 'skeets-overview', label: 'Aktivität' },
      { id: 'skeets-plan', label: 'Skeet planen' }
    ]
  },
  {
    id: 'threads',
    label: 'Threads',
    icon: LayersIcon,
    children: [
      { id: 'threads-overview', label: 'Aktivität' },
      { id: 'threads-plan', label: 'Thread planen' }
    ]
  },
  { id: 'bsky-client', label: 'Bluesky Client', icon: ViewHorizontalIcon },
  { id: 'config', label: 'Konfiguration', icon: GearIcon },
  { id: 'about', label: 'Über Kampagnenbot', icon: InfoCircledIcon }
]

const VALID_VIEWS = (() => {
  const ids = new Set()
  for (const item of NAV_ITEMS) {
    ids.add(item.id)
    if (Array.isArray(item.children)) {
      item.children.forEach(child => ids.add(child.id))
    }
  }
  return ids
})()

// Sekundäre Überschriften, die in den einzelnen Ansichten eingeblendet werden.
const HEADER_CAPTIONS = {
  overview: 'Übersicht',
  skeets: 'Skeets',
  'skeets-overview': 'Skeets',
  'skeets-plan': 'Skeetplaner',
  threads: 'Threads',
  'threads-overview': 'Threads',
  'threads-plan': 'Threadplaner',
  'bsky-client': 'Bluesky Client',
  config: 'Konfiguration',
  about: 'Über Kampagnenbot'
}

// Haupt-Titelzeile der App, getrennt nach Ansicht.
const HEADER_TITLES = {
  overview: 'Bluesky Kampagnen-Dashboard',
  skeets: 'Skeets',
  'skeets-overview': 'Skeet Übersicht',
  'skeets-plan': 'Skeet planen',
  threads: 'Threads',
  'threads-overview': 'Thread Übersicht',
  'threads-plan': 'Thread planen',
  'bsky-client': 'BSky Client',
  config: 'Einstellungen & Automatisierung'
}

// Theme-Konfiguration – liefert Icon, Label und Farbschema für die Theme-Umschaltung.
const THEMES = ['light', 'dark', 'midnight']
const THEME_CONFIG = {
  light: { label: 'Helles Theme', colorScheme: 'light', icon: SunIcon },
  dark: { label: 'Dunkles Theme', colorScheme: 'dark', icon: MoonIcon },
  midnight: { label: 'Mitternacht', colorScheme: 'dark', icon: ShadowIcon }
}
const DEFAULT_THEME = THEMES[0]

const BskyClientAppLazy = lazy(() => import('bsky-client'))
const MainOverviewView = lazy(() => import('./components/views/MainOverviewView'))
const AboutView = lazy(() => import('./components/views/AboutView'))
const DashboardView = lazy(() => import('./components/views/DashboardView'))
const ThreadDashboardView = lazy(() => import('./components/views/ThreadDashboardView'))
const SkeetForm = lazy(() => import('./components/SkeetForm'))
const ThreadForm = lazy(() => import('./components/ThreadForm'))
const ConfigPanel = lazy(() => import('./components/ConfigPanel'))

const DEFAULT_VIEW = 'overview'

function LoadingBlock ({ message }) {
  return (
    <div className='rounded-3xl border border-border bg-background p-6 text-sm text-foreground-muted'>
      {message}
    </div>
  )
}

function App () {
  // --- Globale UI-Zustände -------------------------------------------------
  const { config: clientConfigPreset } = useClientConfig()
  const needsCredentials = Boolean(clientConfigPreset?.needsCredentials)
  const { activeView, gatedNeedsCreds, navigate } = useViewState({
    defaultView: DEFAULT_VIEW,
    validViews: VALID_VIEWS,
    needsCredentials
  })
  const {
    currentThemeConfig,
    nextThemeLabel,
    ThemeIcon: HookThemeIcon,
    toggleTheme
  } = useThemeMode({
    themes: THEMES,
    themeConfig: THEME_CONFIG,
    defaultTheme: DEFAULT_THEME
  })
  const ThemeIcon = HookThemeIcon || SunIcon
  const [editingSkeet, setEditingSkeet] = useState(null)
  const [highlightedSkeetId, setHighlightedSkeetId] = useState(null)
  const plannedListScrollRef = useRef(null)
  const [activeDashboardTab, setActiveDashboardTab] = useState('planned')
  const { dialog: confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()
  const [editingThreadId, setEditingThreadId] = useState(null)
  const toast = useToast()
  const skeetViewsEnabled =
    activeView === 'overview' ||
    activeView === 'skeets' ||
    activeView === 'skeets-overview'
  const threadViewsEnabled =
    activeView === 'overview' ||
    activeView === 'threads' ||
    activeView === 'threads-overview'
  const refreshSkeetsNowRef = useRef(async () => {})
  const refreshThreadsNowRef = useRef(async () => {})
  const handleSkeetEvent = useCallback(async () => {
    if (!skeetViewsEnabled) return
    try {
      await refreshSkeetsNowRef.current?.({ force: true })
    } catch {
      /* ignore */
    }
  }, [skeetViewsEnabled])
  const handleThreadEvent = useCallback(async () => {
    if (!threadViewsEnabled) return
    try {
      await refreshThreadsNowRef.current?.({ force: true })
    } catch {
      /* ignore */
    }
  }, [threadViewsEnabled])

  // Live-Updates via SSE: nach Publish/Re-Status sofort aktualisieren
  // Wichtig: Vor useSkeets/useThreads aufrufen, damit sseConnected verfügbar ist.
  // Echtzeit-Aktualisierung: sobald der Backend-SSE-Stream ein Ereignis meldet,
  // forcieren wir ein erneutes Laden der relevanten Datensätze.
  const { connected: sseConnected } = useSse({
    onSkeetEvent: handleSkeetEvent,
    onThreadEvent: handleThreadEvent
  })

  // Skeet-bezogene Hooks bündeln sämtliche Listen, Detail-Puffer und Aktionen.
  const {
    plannedSkeets,
    publishedSkeets,
    deletedSkeets,
    refreshNow: refreshSkeetsNow,
    fetchReactions,
    showSkeetContent,
    showRepliesContent,
    activeCardTabs,
    repliesBySkeet,
    loadingReplies,
    loadingReactions,
    reactionStats,
    replyErrors
  } = useSkeets({
    enabled: skeetViewsEnabled,
    sseConnected
  })
  refreshSkeetsNowRef.current = refreshSkeetsNow

  // Entsprechende Hook für Threads – analog zu useSkeets.
  const {
    threads,
    loading: threadsLoading,
    error: threadsError,
    refreshNow: refreshThreadsNow
  } = useThreads({
    enabled: threadViewsEnabled,
    sseConnected
  })
  refreshThreadsNowRef.current = refreshThreadsNow
  const { thread: editingThread, loading: loadingEditingThread } =
    useThreadDetail(editingThreadId, {
      autoLoad: Boolean(editingThreadId)
    })

  const {
    exporting,
    importing,
    handleExport,
    handleImportClick,
    handleImportFileChange,
    importInputRef
  } = useImportExport({
    activeView,
    refreshSkeetsNow,
    refreshThreadsNow,
    toast
  })

  const {
    handleDelete: handleDeleteSkeet,
    handleRetract: handleRetractSkeet,
    handlePermanentDelete: handlePermanentDeleteSkeet,
    handleRestore: handleRestoreSkeet
  } = useSkeetActions({
    toast,
    refreshSkeetsNow,
    setEditingSkeet,
    navigate,
    setActiveDashboardTab,
    openConfirm,
    platformLabels: PLATFORM_LABELS
  })

  const {
    handleDeleteThread,
    handleRetractThread,
    handleDestroyThread,
    handleRestoreThread
  } = useThreadActions({
    toast,
    refreshThreadsNow,
    setEditingThreadId,
    navigate,
    openConfirm,
    platformLabels: PLATFORM_LABELS
  })

  // Allow ThreadForm to suggest moving a single-segment thread into Skeet planner
  const [skeetDraftContent, setSkeetDraftContent] = useState('')

  

  useEffect(() => {
    setEditingSkeet(current => {
      if (!current) return current
      const updated = [...plannedSkeets, ...publishedSkeets].find(
        entry => entry.id === current.id
      )
      return updated ?? null
    })
  }, [plannedSkeets, publishedSkeets])

  useEffect(() => {
    if (activeView !== 'skeets-overview') return
    if (activeDashboardTab !== 'planned') return
    const pending = plannedListScrollRef.current
    if (!pending) return
    const container = document.getElementById('app-scroll-container')
    if (!container) return
    const applyRestore = () => {
      const { scrollTop = null, relativeOffset = null, skeetId = null } = pending || {}
      if (relativeOffset != null && skeetId) {
        const entry = document.getElementById(`skeet-${skeetId}`)
        if (entry) {
          const containerRect = container.getBoundingClientRect()
          const entryRect = entry.getBoundingClientRect()
          const delta = (entryRect.top - containerRect.top) - relativeOffset
          container.scrollTop += delta
          plannedListScrollRef.current = null
          return
        }
      }
      if (scrollTop != null) {
        container.scrollTop = scrollTop
      }
      plannedListScrollRef.current = null
    }
    requestAnimationFrame(applyRestore)
  }, [activeView, activeDashboardTab, plannedSkeets])
  // --- Skeets: Übersichtskarten für Gruppen-Landing (verschoben aus Dashboard)
  const overviewStatsSkeets = useMemo(() => {
    const likes = publishedSkeets.reduce(
      (acc, s) => acc + (Number(s.likesCount) || 0),
      0
    )
    const reposts = publishedSkeets.reduce(
      (acc, s) => acc + (Number(s.repostsCount) || 0),
      0
    )
    return [
      { label: 'Geplante Skeets', value: plannedSkeets.length },
      { label: 'Veröffentlichte Skeets', value: publishedSkeets.length },
      { label: 'Likes gesamt', value: likes },
      { label: 'Reposts gesamt', value: reposts }
    ]
  }, [plannedSkeets, publishedSkeets])

  const upcomingSkeet = useMemo(() => {
    const entries = plannedSkeets
      .map(s => {
        if (!s.scheduledAt) return null
        const date = new Date(s.scheduledAt)
        return Number.isNaN(date.getTime())
          ? null
          : { ...s, scheduledDate: date }
      })
      .filter(Boolean)
      .sort((a, b) => a.scheduledDate - b.scheduledDate)
    return entries[0] ?? null
  }, [plannedSkeets])

  const upcomingSkeetDate = upcomingSkeet
    ? formatTime(
        upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate,
        'dateOnly'
      )
    : '-'
  const upcomingSkeetTime = upcomingSkeet
    ? formatTime(
        upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate,
        'timeOnly'
      )
    : null
  const upcomingSkeetSnippet = useMemo(() => {
    if (!upcomingSkeet) return null
    const normalized = (upcomingSkeet.content ?? '').replace(/\s+/g, ' ').trim()
    if (!normalized) return 'Kein Inhalt hinterlegt'
    return normalized.length > 200 ? `${normalized.slice(0, 200)}…` : normalized
  }, [upcomingSkeet])

  // Hinweis: Übersichtskarten für Threads werden aktuell nicht verwendet

  const activityStatsThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : []
    const planned = items.filter(
      t => t.status === 'scheduled' || t.status === 'draft'
    ).length
    const publishedItems = items.filter(t => t.status === 'published')
    let likes = 0
    let reposts = 0
    try {
      for (const thread of publishedItems) {
        const pr = thread?.metadata?.platformResults || {}
        Object.values(pr).forEach(entry => {
          const t = entry?.totals || {}
          likes += Number(t.likes) || 0
          reposts += Number(t.reposts) || 0
        })
      }
    } catch (e) {
      console.error('Fehler bei Aggregation der Thread-Metriken:', e)
    }
    return [
      { label: 'Geplante Threads', value: planned },
      { label: 'Veröffentlichte Threads', value: publishedItems.length },
      { label: 'Likes gesamt', value: likes },
      { label: 'Reposts gesamt', value: reposts }
    ]
  }, [threads])

  const nextScheduledThread = useMemo(() => {
    const items = Array.isArray(threads) ? threads : []
    const now = new Date()
    const candidates = items
      .filter(t => t.status === 'scheduled' && t.scheduledAt)
      .map(thread => {
        const date = new Date(thread.scheduledAt)
        if (Number.isNaN(date.getTime()) || date < now) return null
        return { thread, date }
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date)
    return candidates[0] ?? null
  }, [threads])

  const nextThreadFormatted = nextScheduledThread
    ? formatTime(nextScheduledThread.thread.scheduledAt, 'dateTime')
    : null
  const [nextThreadDate, nextThreadTimeRaw] = nextThreadFormatted
    ? nextThreadFormatted.split(',').map(p => p.trim())
    : ['-', '']
  const nextThreadTime = nextThreadTimeRaw ? `${nextThreadTimeRaw} Uhr` : ''

  const handleEdit = skeet => {
    try {
      const container = document.getElementById('app-scroll-container')
      const payload = { scrollTop: container?.scrollTop ?? 0 }
      if (container && skeet?.id) {
        const entry = document.getElementById(`skeet-${skeet.id}`)
        if (entry) {
          const containerRect = container.getBoundingClientRect()
          const entryRect = entry.getBoundingClientRect()
          payload.relativeOffset = entryRect.top - containerRect.top
          payload.skeetId = skeet.id
        }
      }
      plannedListScrollRef.current = payload
    } catch {
      plannedListScrollRef.current = null
    }
    setEditingSkeet(skeet)
    navigate('skeets-plan')
  }

  const handleEditThread = thread => {
    setEditingThreadId(thread?.id ?? null)
    navigate('threads-plan')
  }

  // Thread-spezifische Aktionen liefert useThreadActions

  const handleFormSaved = async () => {
    const editedId = editingSkeet?.id ?? null
    setEditingSkeet(null)
    try { setSkeetDraftContent('') } catch (e) { console.error(e); }
    // Zuerst in die Übersicht wechseln, dann gezielt refreshen
    navigate('skeets-overview')
    setActiveDashboardTab('planned')
    if (editedId) {
      setHighlightedSkeetId(editedId)
    }
    await new Promise(r => setTimeout(r, 0))
    await refreshSkeetsNow({ force: true })
  }

  const handleThreadSaved = async () => {
    setEditingThreadId(null)
    navigate('threads-overview')
    await new Promise(r => setTimeout(r, 0))
    await refreshThreadsNow({ force: true })
  }

  const handleThreadCancel = () => {
    setEditingThreadId(null)
    navigate('threads-overview')
    toast.info({
      title: 'Bearbeitung abgebrochen',
      description: 'Der Thread wurde nicht verändert.'
    })
  }

  const handleCancelEdit = () => {
    setEditingSkeet(null)
    navigate('skeets-overview')
    toast.info({
      title: 'Bearbeitung abgebrochen',
      description: 'Der Skeet wurde nicht verändert.'
    })
  }

  const headerCaption = HEADER_CAPTIONS[activeView] ?? ''
  const headerTitle =
    HEADER_TITLES[activeView] ??
    NAV_ITEMS.find(item => item.id === activeView)?.label ??
    ''

  const isThreadContext = activeView.startsWith('threads')
  const exportButtonLabel = exporting
    ? 'Export…'
    : isThreadContext
    ? 'Threads exportieren'
    : 'Skeets exportieren'
  const importButtonLabel = importing
    ? 'Import…'
    : isThreadContext
    ? 'Threads importieren'
    : 'Skeets importieren'

  const headerActions = (
    <>
      <Button
        variant='ghost'
        size='icon'
        onClick={toggleTheme}
        aria-label={`Theme wechseln - nächstes: ${nextThemeLabel}`}
        title={`Theme wechseln - nächstes: ${nextThemeLabel}`}
      >
        <ThemeIcon className='h-4 w-4' />
        <span className='sr-only'>
          Aktuelles Theme: {currentThemeConfig?.label}
        </span>
      </Button>
      {(activeView === 'skeets-overview' ||
        activeView === 'threads-overview') && (
        <>
          <Button
            variant='secondary'
            onClick={handleExport}
            disabled={exporting}
            aria-label={exportButtonLabel}
            title={exportButtonLabel}
            className='inline-flex items-center gap-2'
          >
            <DownloadIcon className='h-4 w-4' />
            <span className='hidden sm:inline'>{exportButtonLabel}</span>
          </Button>
          <Button
            variant='primary'
            onClick={handleImportClick}
            disabled={importing}
            aria-label={importButtonLabel}
            title={importButtonLabel}
            className='inline-flex items-center gap-2'
          >
            <UploadIcon className='h-4 w-4' />
            <span className='hidden sm:inline'>{importButtonLabel}</span>
          </Button>
          <input
            ref={importInputRef}
            type='file'
            accept='application/json'
            className='hidden'
            onChange={handleImportFileChange}
          />
        </>
      )}
    </>
  )

  let content = null
  const availableNavItems = gatedNeedsCreds
    ? [{ id: 'config', label: 'Konfiguration', icon: GearIcon }]
    : NAV_ITEMS

  if (gatedNeedsCreds) {
    content = (
      <Suspense fallback={<LoadingBlock message='Konfiguration wird geladen…' />}>
        <ConfigPanel />
      </Suspense>
    )
  } else if (activeView === 'overview') {
    content = (
      <Suspense fallback={<LoadingBlock message='Übersicht wird geladen…' />}>
        <MainOverviewView
          threads={threads}
          plannedSkeets={plannedSkeets}
          publishedSkeets={publishedSkeets}
          onOpenSkeetsOverview={() => navigate('skeets-overview')}
          onOpenThreadsOverview={() => navigate('threads-overview')}
        />
      </Suspense>
    )
  } else if (activeView === 'skeets') {
    content = (
      <>
        <section className='grid gap-4 md:grid-cols-3'>
          <ActivityPanel
            className='md:col-span-2'
            title='Skeet Aktivität'
            description='Status deiner geplanten und veröffentlichten Skeets.'
            items={overviewStatsSkeets}
          />
          <SummaryCard
            title='Nächster Skeet'
            value={upcomingSkeetDate}
            time={upcomingSkeetTime ? `${upcomingSkeetTime} Uhr` : null}
            snippet={
              typeof upcomingSkeetSnippet !== 'undefined' && upcomingSkeet
                ? upcomingSkeetSnippet
                : 'Noch nichts geplant'
            }
          />
        </section>

        
      </>
    )
  } else if (activeView === 'threads') {
    content = (
      <>
        <section className='grid gap-4 md:grid-cols-3'>
          <ActivityPanel
            className='md:col-span-2'
            title='Thread Aktivität'
            description='Status deiner geplanten und veröffentlichten Threads.'
            items={activityStatsThreads}
          />
          <SummaryCard
            title='Nächster Thread'
            value={nextThreadDate}
            time={nextThreadTime || null}
            snippet={
              nextScheduledThread
                ? (nextScheduledThread.thread.segments?.[0]?.content || '')
                    .toString()
                    .trim() || 'Kein Inhalt hinterlegt'
                : 'Noch nichts geplant'
            }
          />
        </section>
      </>
    )
  } else if (activeView === 'skeets-overview') {
    content = (
      <Suspense fallback={<LoadingBlock message='Skeet Aktivität wird geladen…' />}>
        <DashboardView
          plannedSkeets={plannedSkeets}
          publishedSkeets={publishedSkeets}
          deletedSkeets={deletedSkeets}
          onEditSkeet={handleEdit}
          onDeleteSkeet={handleDeleteSkeet}
          onRetractSkeet={handleRetractSkeet}
          onRestoreSkeet={handleRestoreSkeet}
          onPermanentDeleteSkeet={handlePermanentDeleteSkeet}
          onFetchReactions={fetchReactions}
          onShowSkeetContent={showSkeetContent}
          onShowRepliesContent={showRepliesContent}
          activeCardTabs={activeCardTabs}
          repliesBySkeet={repliesBySkeet}
          replyErrors={replyErrors}
          loadingReplies={loadingReplies}
          loadingReactions={loadingReactions}
          reactionStats={reactionStats}
          formatTime={formatTime}
          getRepeatDescription={getRepeatDescription}
          platformLabels={PLATFORM_LABELS}
          activeTab={activeDashboardTab}
          onTabChange={setActiveDashboardTab}
          highlightedSkeetId={highlightedSkeetId}
          onHighlightConsumed={() => setHighlightedSkeetId(null)}
        />
      </Suspense>
    )
  } else if (activeView === 'threads-overview') {
    content = (
      <Suspense fallback={<LoadingBlock message='Thread Aktivität wird geladen…' />}>
        <ThreadDashboardView
          threads={threads}
          loading={threadsLoading}
          error={threadsError}
          onReload={refreshThreadsNow}
          onEditThread={handleEditThread}
          onDeleteThread={handleDeleteThread}
          onRestoreThread={handleRestoreThread}
          onDestroyThread={handleDestroyThread}
          onRetractThread={handleRetractThread}
        />
      </Suspense>
    )
  } else if (activeView === 'config') {
    content = (
      <Suspense fallback={<LoadingBlock message='Konfiguration wird geladen…' />}>
        <ConfigPanel />
      </Suspense>
    )
  } else if (activeView === 'bsky-client') {
    content = (
      <Card padding='p-4'>
        <Suspense fallback={<p className='p-6 text-sm text-foreground-muted'>Bluesky Client wird geladen…</p>}>
          <BskyClientAppLazy />
        </Suspense>
      </Card>
    )
  } else if (activeView === 'about') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <Suspense fallback={<p className='text-sm text-foreground-muted'>Infoansicht wird geladen…</p>}>
          <AboutView />
        </Suspense>
      </Card>
    )
  } else if (activeView === 'skeets-plan') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <Suspense fallback={<p className='text-sm text-foreground-muted'>Skeet-Formular wird geladen…</p>}>
          <SkeetForm
            onSkeetSaved={handleFormSaved}
            editingSkeet={editingSkeet}
            onCancelEdit={handleCancelEdit}
            initialContent={editingSkeet ? undefined : skeetDraftContent}
          />
        </Suspense>
      </Card>
    )
  } else if (activeView === 'threads-plan') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <Suspense fallback={<p className='text-sm text-foreground-muted'>Thread-Formular wird geladen…</p>}>
          <ThreadForm
            key={editingThreadId || 'new'}
            initialThread={editingThreadId ? editingThread : null}
            loading={Boolean(
              editingThreadId && loadingEditingThread && !editingThread
            )}
            onThreadSaved={handleThreadSaved}
            onCancel={editingThreadId ? handleThreadCancel : undefined}
            onSuggestMoveToSkeets={(content) => {
              try {
                setEditingThreadId(null)
              } catch (error) {
                console.warn('Konnte Thread-Auswahl nicht zurücksetzen', error)
              }
              setSkeetDraftContent(content || '')
              navigate('skeets-plan')
            }}
          />
        </Suspense>
      </Card>
    )
  }

  const safeSelectView = (viewId, options) => navigate(viewId, options)

  return (
    <ThemeProvider value={{
      panelBg: 'bg-background',
      cardBg: 'bg-background',
      cardHover: false
    }}>
    <AppLayout
      navItems={availableNavItems}
      activeView={activeView}
      onSelectView={safeSelectView}
      headerCaption={headerCaption}
      headerTitle={headerTitle}
      headerActions={headerActions}
      showScrollTop={activeView !== 'bsky-client'}
    >
      {content}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel || 'Abbrechen'}
        variant={confirmDialog.variant || 'primary'}
        onConfirm={confirmDialog.onConfirm || closeConfirm}
        onCancel={closeConfirm}
      />
    </AppLayout>
    </ThemeProvider>
  )
}

export default App
