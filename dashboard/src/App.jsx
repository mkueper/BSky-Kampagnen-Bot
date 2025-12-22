// Zentrale Einstiegskomponente für das Dashboard. Kümmert sich um Navigation,
// Datenabfragen, Themenverwaltung sowie das Einbinden der verschiedenen Views.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, lazy } from 'react'
import {
  DownloadIcon,
  ExternalLinkIcon,
  GearIcon,
  LayersIcon,
  Pencil2Icon,
  UploadIcon,
  ViewHorizontalIcon,
  InfoCircledIcon,
  ExitIcon
} from '@radix-ui/react-icons'
import {
  Button,
  Card,
  ThemeToggle,
  useThemeMode,
  ConfirmDialog,
  useToast,
  useConfirmDialog,
  InfoDialog
} from '@bsky-kampagnen-bot/shared-ui'
import AppLayout from './components/layout/AppLayout'
import { ThemeProvider as UiThemeProvider } from './components/ui/ThemeContext'
import { useClientConfig } from './hooks/useClientConfig'
import NextScheduledCard from './components/ui/NextScheduledCard.jsx'
import ActivityPanel from './components/ui/ActivityPanel'
import { useSkeets } from './hooks/useSkeets'
import { useThreadDetail, useThreads } from './hooks/useThreads'
import { useSse } from './hooks/useSse'
import { formatTime } from './utils/formatTime'
import { getRepeatDescription } from './utils/timeUtils'
import { useViewState } from './hooks/useViewState'
import { useImportExport } from './hooks/useImportExport'
import { useSkeetActions } from './hooks/useSkeetActions'
import { useThreadActions } from './hooks/useThreadActions'
import LoginView from './components/views/LoginView'
import { useSession } from './hooks/useSession'
import { useTranslation } from './i18n/I18nProvider.jsx'
// UI-Beschriftungen für Plattform-Kürzel – wird an mehreren Stellen benötigt.
const PLATFORM_LABELS = {
  bluesky: 'Bluesky',
  mastodon: 'Mastodon'
}

// Seitenstruktur für die linke Navigation. Hier steht, welche Tabs angezeigt
// werden und unter welchen IDs sie später adressiert werden.
const BASE_NAV_ITEMS = [
  { id: 'overview', label: 'Übersicht', icon: ViewHorizontalIcon },
  {
    id: 'skeets',
    label: 'Posts',
    icon: Pencil2Icon,
    children: [
      { id: 'skeets-overview', label: 'Aktivität' },
      { id: 'skeets-plan', label: 'Planen' }
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
  { id: 'config', label: 'Konfiguration', icon: GearIcon },
  { id: 'about', label: 'Über Kampagnen‑Tool', icon: InfoCircledIcon }
]

const VALID_VIEWS = (() => {
  const ids = new Set()
  for (const item of BASE_NAV_ITEMS) {
    ids.add(item.id)
    if (Array.isArray(item.children)) {
      item.children.forEach(child => ids.add(child.id))
    }
  }
  return ids
})()

// Sekundäre Überschriften, die in den einzelnen Ansichten eingeblendet werden.
const HEADER_CAPTIONS = {
  overview: 'Kampagnen – Übersicht',
  skeets: 'Posts – Übersicht',
  'skeets-overview': 'Posts – Übersicht',
  'skeets-plan': 'Post planen',
  threads: 'Threads – Übersicht',
  'threads-overview': 'Threads – Übersicht',
  'threads-plan': 'Thread planen',
  config: 'Konfiguration',
  about: 'Über Kampagnen‑Tool'
}

// Haupt-Titelzeile der App, getrennt nach Ansicht.
const HEADER_TITLES = {
  overview: 'Kampagnen – Übersicht',
  skeets: 'Posts – Übersicht',
  'skeets-overview': 'Posts – Übersicht',
  'skeets-plan': 'Post planen',
  threads: 'Threads – Übersicht',
  'threads-overview': 'Threads – Übersicht',
  'threads-plan': 'Thread planen',
  config: 'Einstellungen & Automatisierung'
}

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

function DashboardApp ({ onLogout }) {
  const { t, setLocale } = useTranslation()
  // --- Globale UI-Zustände -------------------------------------------------
  const { config: clientConfigPreset } = useClientConfig()
  const needsCredentials = Boolean(clientConfigPreset?.needsCredentials)
  const { activeView, gatedNeedsCreds, navigate } = useViewState({
    defaultView: DEFAULT_VIEW,
    validViews: VALID_VIEWS,
    needsCredentials
  })
  //console.log('[DashboardApp] activeView', activeView)
  const {
    currentThemeConfig,
    nextThemeLabel,
    nextThemeConfig,
    ThemeIcon: HookThemeIcon,
    toggleTheme
  } = useThemeMode()

  const ThemeIcon = HookThemeIcon
  const currentThemeLabel = currentThemeConfig?.labelKey
    ? t(
        currentThemeConfig.labelKey,
        currentThemeConfig.label || currentThemeConfig.labelKey
      )
    : currentThemeConfig?.label || '—'
  const nextThemeLabelFallback =
    nextThemeLabel || nextThemeConfig?.label || currentThemeConfig?.label || ''
  const nextThemeTranslated = nextThemeConfig?.labelKey
    ? t(nextThemeConfig.labelKey, nextThemeLabelFallback)
    : nextThemeLabelFallback
  const themeToggleProps = {
    icon: ThemeIcon,
    label: t('theme.toggle.label', 'Theme'),
    modeLabel: currentThemeLabel,
    nextLabel: nextThemeTranslated,
    nextColor: nextThemeConfig?.previewColor,
    nextBorderColor: nextThemeConfig?.previewColor,
    onToggle: toggleTheme,
    ariaLabel: t('theme.toggle.ariaLabel', 'Theme wechseln – {label}', {
      label: nextThemeTranslated || ''
    })
  }
  const [editingSkeet, setEditingSkeet] = useState(null)
  const [highlightedSkeetId, setHighlightedSkeetId] = useState(null)
  const plannedListScrollRef = useRef(null)
  const [activeDashboardTab, setActiveDashboardTab] = useState('planned')
  const { dialog: confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()
  const [editingThreadId, setEditingThreadId] = useState(null)
  const toast = useToast()
  const [logoutPending, setLogoutPending] = useState(false)
  const [importExportInfoOpen, setImportExportInfoOpen] = useState(false)
  const [clientUrls, setClientUrls] = useState({ bluesky: '', mastodon: '' })
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
  const refreshClientUrls = useCallback(async () => {
    try {
      const res = await fetch('/api/config/credentials', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setClientUrls({
        bluesky: data?.bluesky?.clientApp || '',
        mastodon: data?.mastodon?.clientApp || ''
      })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    refreshClientUrls()
  }, [refreshClientUrls])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = () => refreshClientUrls()
    window.addEventListener('client-apps:refresh', handler)
    return () => window.removeEventListener('client-apps:refresh', handler)
  }, [refreshClientUrls])

  const handleOpenClientUrl = useCallback((url) => {
    const safe = (url ?? '').toString().trim()
    if (!safe) {
      toast.error({
        title: t('nav.clientLauncherErrorTitle', 'Client konnte nicht geöffnet werden'),
        description: t('nav.clientLauncherErrorDescription', 'Bitte Konfiguration prüfen.')
      })
      return
    }
    const opened = window.open(safe, '_blank', 'noopener')
    if (!opened) {
      toast.error({
        title: t('nav.clientLauncherErrorTitle', 'Client konnte nicht geöffnet werden'),
        description: t('nav.clientLauncherPopupBlocked', 'Bitte Popups erlauben.')
      })
    }
  }, [toast, t])
  // Locale aus Client-Config auf den i18n-Context spiegeln (persistente Auswahl)
  useEffect(() => {
    const cfgLocale = clientConfigPreset?.locale
    if (!cfgLocale) return
    const short = String(cfgLocale).split('-')[0].toLowerCase()
    if (short) {
      setLocale(short)
    }
  }, [clientConfigPreset?.locale, setLocale])
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

  const navItems = useMemo(() => {
    const localizedBase = BASE_NAV_ITEMS.map(item => {
      const baseLabel = item.label
      const translatedLabel = t(`nav.${item.id}`, baseLabel)
      const children = Array.isArray(item.children)
        ? item.children.map(child => ({
            ...child,
            label: t(`nav.${child.id}`, child.label)
          }))
        : undefined
      return {
        ...item,
        label: translatedLabel,
        children
      }
    })

    const blueskyUrl = String(clientUrls?.bluesky || '').trim()
    const mastodonUrl = String(clientUrls?.mastodon || '').trim()
    const hasBluesky = Boolean(blueskyUrl)
    const hasMastodon = Boolean(mastodonUrl)
    const hasAny = hasBluesky || hasMastodon
    if (!hasAny) return localizedBase
    const bothAvailable = hasBluesky && hasMastodon
    const clientLabel = bothAvailable
      ? t('nav.clientLauncher', 'Client öffnen')
      : hasBluesky
        ? t('nav.blueskyClient', 'Bluesky Client')
        : t('nav.mastodonClient', 'Mastodon Client')
    const clientItem = {
      id: 'client-launcher',
      label: clientLabel,
      icon: ExternalLinkIcon,
      actionOnly: true,
      onSelect: !bothAvailable
        ? () => handleOpenClientUrl(hasBluesky ? blueskyUrl : mastodonUrl)
        : null,
      menuItems: bothAvailable
        ? [
          {
            id: 'client-launcher-bluesky',
            label: t('nav.blueskyClient', 'Bluesky Client'),
            onSelect: () => handleOpenClientUrl(blueskyUrl)
          },
          {
            id: 'client-launcher-mastodon',
            label: t('nav.mastodonClient', 'Mastodon Client'),
            onSelect: () => handleOpenClientUrl(mastodonUrl)
          }
        ]
        : null
    }

    const items = [...localizedBase]
    const configIndex = items.findIndex(item => item.id === 'config')
    const insertAt = configIndex >= 0 ? configIndex + 1 : items.length
    items.splice(insertAt, 0, clientItem)
    return items
  }, [clientUrls, handleOpenClientUrl, t])

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
    skeets,
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

  const pendingSkeets = useMemo(() => {
    return Array.isArray(skeets)
      ? skeets.filter(s => !s.deletedAt && s.status === 'pending_manual')
      : []
  }, [skeets])

  const plannedSkeetsWithoutPending = useMemo(() => {
    return Array.isArray(plannedSkeets)
      ? plannedSkeets.filter(s => s.status !== 'pending_manual')
      : []
  }, [plannedSkeets])

  const handlePublishPendingOnce = useCallback(
    async skeet => {
      const id = skeet && typeof skeet.id === 'number' ? skeet.id : null
      if (!id) return
      try {
        const res = await fetch(`/api/pending-skeets/${id}/publish-once`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const message =
            data && typeof data.error === 'string'
              ? data.error
              : 'Fehler beim einmaligen Veröffentlichen.'
          throw new Error(message)
        }
        await refreshSkeetsNow({ force: true })
        toast.success({
          title: 'Post gesendet',
          description: 'Die verpasste Ausführung wurde nachgeholt.'
        })
      } catch (error) {
        toast.error({
          title: 'Freigabe fehlgeschlagen',
          description:
            (error && error.message)
              ? `Der Beitrag konnte nicht gesendet werden: ${error.message}`
              : 'Der Beitrag konnte nicht gesendet werden.'
        })
      }
    },
    [refreshSkeetsNow, toast]
  )

  const handleDiscardPendingSkeet = useCallback(
    skeet => {
      const id = skeet && typeof skeet.id === 'number' ? skeet.id : null
      if (!id) return
      openConfirm({
        title: 'Termin überspringen',
        description:
          'Die verpasste Ausführung wird verworfen. Der nächste Wiederholungstermin bleibt aktiv.',
        confirmLabel: 'Termin überspringen',
        variant: 'destructive',
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/pending-skeets/${id}/discard`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              const message =
                data && typeof data.error === 'string'
                  ? data.error
                  : 'Fehler beim Verwerfen des Pending-Skeets.'
              throw new Error(message)
            }
            await refreshSkeetsNow({ force: true })
            toast.success({
              title: 'Termin übersprungen',
              description:
                'Die verpasste Ausführung wurde verworfen, der Rhythmus läuft weiter.'
            })
          } catch (error) {
            toast.error({
              title: 'Aktion fehlgeschlagen',
              description:
                (error && error.message)
                  ? `Die Pending-Aktion konnte nicht ausgeführt werden: ${error.message}`
                  : 'Die Pending-Aktion konnte nicht ausgeführt werden.'
            })
          }
        }
      })
    },
    [openConfirm, refreshSkeetsNow, toast]
  )
  

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
      { label: 'Geplante Posts', value: plannedSkeetsWithoutPending.length },
      { label: 'Veröffentlichte Posts', value: publishedSkeets.length },
      { label: 'Likes gesamt', value: likes },
      { label: 'Reposts gesamt', value: reposts }
    ]
  }, [plannedSkeetsWithoutPending, publishedSkeets])

  const upcomingSkeet = useMemo(() => {
    const entries = plannedSkeetsWithoutPending
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
  }, [plannedSkeetsWithoutPending])

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

  const cancelSkeetEditing = useCallback(
    ({ keepView = false, silent = false } = {}) => {
      if (!editingSkeet) return
      setEditingSkeet(null)
      if (!silent) {
        toast.info({
          title: 'Bearbeitung abgebrochen',
          description: 'Der Beitrag wurde nicht verändert.'
        })
      }
      if (!keepView) {
        navigate('skeets-overview')
      }
    },
    [editingSkeet, navigate, toast]
  )

  const cancelThreadEditing = useCallback(
    ({ keepView = false, silent = false } = {}) => {
      if (!editingThreadId) return
      setEditingThreadId(null)
      if (!silent) {
        toast.info({
          title: 'Bearbeitung abgebrochen',
          description: 'Der Thread wurde nicht verändert.'
        })
      }
      if (!keepView) {
        navigate('threads-overview')
      }
    },
    [editingThreadId, navigate, toast]
  )

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
    cancelThreadEditing()
  }

  const handleCancelEdit = () => {
    cancelSkeetEditing()
  }

  const handleLogoutClick = useCallback(async () => {
    if (typeof onLogout !== 'function') return
    try {
      setLogoutPending(true)
      await onLogout()
    } catch (error) {
      toast.error({
        title: 'Abmeldung fehlgeschlagen',
        description: error?.message || 'Bitte erneut versuchen.'
      })
    } finally {
      setLogoutPending(false)
    }
  }, [onLogout, toast])
  const headerCaption = HEADER_CAPTIONS[activeView]
    ? t(`header.caption.${activeView}`, HEADER_CAPTIONS[activeView])
    : ''
  const headerTitle =
    HEADER_TITLES[activeView]
      ? t(`header.title.${activeView}`, HEADER_TITLES[activeView])
      : BASE_NAV_ITEMS.find(item => item.id === activeView)?.label ??
        ''

  const isThreadContext = activeView.startsWith('threads')
  const exportButtonLabel = exporting
    ? t('export.buttonBusy', 'Export…')
    : isThreadContext
        ? t('threads.export.buttonLabel', 'Threads exportieren')
        : t('postsExtra.export.buttonLabel', 'Posts exportieren')
  const importButtonLabel = importing
    ? t('import.buttonBusy', 'Import…')
    : isThreadContext
        ? t('threads.import.buttonLabel', 'Threads importieren')
        : t('postsExtra.import.buttonLabel', 'Posts importieren')

  const headerActions = (
    <>
      {(activeView === 'skeets-overview' ||
        activeView === 'threads-overview') && (
        <>
          <div className='inline-flex rounded-2xl border border-border-muted bg-background-elevated p-1 shadow-soft'>
            <div className='flex items-center gap-2'>
              <Button
                variant='secondary'
                onClick={handleExport}
                disabled={exporting}
                aria-label={exportButtonLabel}
                title={exportButtonLabel}
                className='inline-flex items-center justify-center gap-2'
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
                className='inline-flex items-center justify-center gap-2'
              >
                <UploadIcon className='h-4 w-4' />
                <span className='hidden sm:inline'>{importButtonLabel}</span>
              </Button>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-background-elevated'
                aria-label={t(
                  'importExport.infoAria',
                  'Hinweis zu Import & Export anzeigen'
                )}
                title={t('posts.form.infoButtonTitle', 'Hinweis anzeigen')}
                onClick={() => setImportExportInfoOpen(true)}
              >
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 15 15'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  <path
                    d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z'
                    fill='currentColor'
                  />
                  <path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z'
                    fill='currentColor'
                  />
                </svg>
                {t('posts.form.infoButtonLabel', 'Info')}
              </button>
            </div>
          </div>
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

  const navFooter = (
    <div className='flex w-full flex-col gap-3'>
      <ThemeToggle
        {...themeToggleProps}
        layout='simple'
        variant='subtle'
        size='default'
        iconStyle='inline'
        className='w-full justify-between'
      />
      <Button
        type='button'
        variant='outline'
        className='w-full justify-center text-sm font-semibold'
        onClick={handleLogoutClick}
        disabled={logoutPending}
      >
        <ExitIcon className='h-4 w-4' />
        <span>{t('auth.logout.button', 'Abmelden')}</span>
      </Button>
    </div>
  )

  let content = null
  const availableNavItems = gatedNeedsCreds
    ? [
        {
          id: 'config',
          label: t('nav.config', 'Konfiguration'),
          icon: GearIcon
        }
      ]
    : navItems

  if (gatedNeedsCreds) {
    content = (
      <Suspense
        fallback={
          <LoadingBlock
            message={t(
              'config.loading',
              'Konfiguration wird geladen…'
            )}
          />
        }
      >
        <ConfigPanel />
      </Suspense>
    )
  } else if (activeView === 'overview') {
    content = (
      <Suspense
        fallback={
          <LoadingBlock
            message={t('overview.loading', 'Übersicht wird geladen…')}
          />
        }
      >
        <MainOverviewView
          threads={threads}
          plannedSkeets={plannedSkeets}
          publishedSkeets={publishedSkeets}
          pendingCount={pendingSkeets.length}
          onOpenSkeetsOverview={() => navigate('skeets-overview')}
          onOpenPendingSkeets={() => {
            setActiveDashboardTab('pending')
            navigate('skeets-overview')
          }}
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
            title={t('posts.activity.title', 'Post-Aktivität')}
            description={t(
              'postsExtra.activity.descriptionShort',
              'Status geplanter und veröffentlichter Posts.'
            )}
            items={overviewStatsSkeets}
          />
          <NextScheduledCard
            title={t(
              'postsExtra.overview.next.title',
              'Nächster Post'
            )}
            scheduledAt={
              upcomingSkeet?.scheduledAt || upcomingSkeet?.scheduledDate || null
            }
            content={upcomingSkeetSnippet}
            emptyLabel={t(
              'postsExtra.overview.next.none',
              'Noch nichts geplant'
            )}
            noContentLabel={t(
              'threads.overview.next.noContent',
              'Kein Inhalt hinterlegt'
            )}
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
            title={t('threads.activity.title', 'Thread Aktivität')}
            description={t(
              'threads.activityExtra.descriptionShort',
              'Status geplanter und veröffentlichter Threads.'
            )}
            items={activityStatsThreads}
          />
          <NextScheduledCard
            title={t('threads.overview.next.title', 'Nächster Thread')}
            scheduledAt={nextScheduledThread?.thread?.scheduledAt || null}
            content={
              nextScheduledThread
                ? (nextScheduledThread.thread.segments?.[0]?.content || '')
                : ''
            }
            emptyLabel={t(
              'threads.overview.next.none',
              'Noch nichts geplant'
            )}
            noContentLabel={t(
              'threads.overview.next.noContent',
              'Kein Inhalt hinterlegt'
            )}
          />
        </section>
      </>
    )
  } else if (activeView === 'skeets-overview') {
    content = (
      <Suspense
        fallback={
          <LoadingBlock
            message={t(
              'posts.activity.loading',
              'Post-Aktivität wird geladen…'
            )}
          />
        }
      >
        <DashboardView
          plannedSkeets={plannedSkeetsWithoutPending}
          publishedSkeets={publishedSkeets}
          deletedSkeets={deletedSkeets}
          pendingSkeets={pendingSkeets}
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
          onPublishPendingOnce={handlePublishPendingOnce}
          onDiscardPendingSkeet={handleDiscardPendingSkeet}
        />
      </Suspense>
    )
  } else if (activeView === 'threads-overview') {
    content = (
      <Suspense
        fallback={
          <LoadingBlock
            message={t(
              'threads.activity.loading',
              'Thread Aktivität wird geladen…'
            )}
          />
        }
      >
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
      <Suspense
        fallback={
          <LoadingBlock
            message={t(
              'config.loading',
              'Konfiguration wird geladen…'
            )}
          />
        }
      >
        <ConfigPanel />
      </Suspense>
    )
  } else if (activeView === 'about') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <Suspense
          fallback={
            <p className='text-sm text-foreground-muted'>
              {t(
                'about.loading',
                'Infoansicht wird geladen…'
              )}
            </p>
          }
        >
          <AboutView />
        </Suspense>
      </Card>
    )
  } else if (activeView === 'skeets-plan') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <Suspense
          fallback={
            <p className='text-sm text-foreground-muted'>
              {t(
                'posts.form.loading',
                'Post-Formular wird geladen…'
              )}
            </p>
          }
        >
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
        <Suspense
          fallback={
            <p className='text-sm text-foreground-muted'>
              {t(
                'threads.form.loading',
                'Thread-Formular wird geladen…'
              )}
            </p>
          }
        >
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

  useEffect(() => {
    if (activeView !== 'skeets-plan' && editingSkeet) {
      cancelSkeetEditing({ keepView: true })
    }
  }, [activeView, editingSkeet, cancelSkeetEditing])

  useEffect(() => {
    if (activeView !== 'threads-plan' && editingThreadId) {
      cancelThreadEditing({ keepView: true })
    }
  }, [activeView, cancelThreadEditing, editingThreadId])

  const safeSelectView = (viewId, options) => navigate(viewId, options)

  return (
    <UiThemeProvider value={{
      // panelBg: 'bg-background',
      panelBg: 'bg-background/80 backdrop-blur-lg',
      cardBg: 'bg-background',
      cardHover: false
    }}>
    <InfoDialog
      open={importExportInfoOpen}
      title={t(
        'importExport.infoTitle',
        'Import & Export von Posts und Threads'
      )}
      onClose={() => setImportExportInfoOpen(false)}
      closeLabel={t('common.actions.close', 'Schließen')}
      panelClassName='max-w-[80vw] md:max-w-[800px]'
      content={(
        <div className='max-h-[60vh] overflow-y-auto space-y-3 text-sm text-foreground'>
          <p>
            {t(
              'importExport.infoIntro',
              'Posts und Threads können als JSON-Dateien exportiert und später wieder importiert werden – zum Beispiel für Backups, Migrationen oder zum Testen in einer anderen Umgebung.'
            )}
          </p>
          <p>
            {t(
              'importExport.infoFormat',
              'Exportierte Dateien enthalten geplante Posts bzw. Threads mit ihren Feldern (z. B. Inhalt, Zeitpunkte, Wiederholungsregeln) und gegebenenfalls eingebettete Medien als Data-URLs (mit MIME-Typ, optionalem ALT-Text und Binärdaten). Die Struktur entspricht dem in der API-Dokumentation beschriebenen Schema und sollte nicht manuell verändert werden.'
            )}
          </p>
          <p>
            {t(
              'importExport.infoDuplicates',
              'Beim Import wird die Datei als Ganzes eingelesen. Duplikate – etwa dieselbe Kombination aus Inhalt/Titel, Termin und Wiederholungsregeln oder identische Thread-Segmente – werden ignoriert. Ein mehrfaches Importieren derselben Datei legt daher keine doppelten Einträge an.'
            )}
          </p>
          <p>
            {t(
              'importExport.infoAltText',
              'ALT-Texte aus dem Export werden beim Import übernommen und den betroffenen Medien wieder zugeordnet. Wenn Medien nicht im Export enthalten sind, können sie nach dem Import in den Formularen wie gewohnt ergänzt werden.'
            )}
          </p>
          <p className='text-xs text-foreground-muted'>
            {t(
              'importExport.infoHint',
              'In der Praxis ist es sinnvoll, Import und Export zunächst mit einem kleineren Ausschnitt oder in einer Testumgebung auszuprobieren, bevor größere Kampagnenbestände migriert werden.'
            )}
          </p>
        </div>
      )}
    />
    <AppLayout
      navItems={availableNavItems}
      activeView={activeView}
      onSelectView={safeSelectView}
      headerCaption={headerCaption}
      headerTitle={headerTitle}
      headerActions={headerActions}
      headerHidden={false}
      navFooter={navFooter}
      showScrollTop
    >
      {content}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={
          confirmDialog.cancelLabel ||
          t('common.actions.cancel', 'Abbrechen')
        }
        variant={confirmDialog.variant || 'primary'}
        onConfirm={confirmDialog.onConfirm || closeConfirm}
        onCancel={closeConfirm}
      />
    </AppLayout>
    </UiThemeProvider>
  )
}

function App () {
  const { session, loading, error, refresh } = useSession()

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (err) {
      console.error('Logout fehlgeschlagen', err)
    } finally {
      await refresh()
    }
  }, [refresh])

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground'>
        <LoadingBlock message='Sitzung wird geprüft…' />
      </div>
    )
  }

  if (!session?.configured) {
    return <LoginView session={session} sessionError={error} refreshSession={refresh} />
  }

  if (!session?.authenticated) {
    return <LoginView session={session} sessionError={error} refreshSession={refresh} />
  }

  return (
    <DashboardApp onLogout={handleLogout} />
  )
}

export default App
