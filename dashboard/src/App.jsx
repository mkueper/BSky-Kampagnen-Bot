import { useEffect, useRef, useState, useMemo } from 'react'
import {
  DownloadIcon,
  GearIcon,
  LayersIcon,
  MoonIcon,
  Pencil2Icon,
  ShadowIcon,
  SunIcon,
  UploadIcon,
  ViewHorizontalIcon
} from '@radix-ui/react-icons'
import AppLayout from './components/layout/AppLayout'
import { useClientConfig } from './hooks/useClientConfig'
import Button from './components/ui/Button'
import Card from './components/ui/Card'
import SummaryCard from './components/ui/SummaryCard'
import ActivityPanel from './components/ui/ActivityPanel'
import MainOverviewView from './components/views/MainOverviewView'
import DashboardView from './components/views/DashboardView'
import ThreadDashboardView from './components/views/ThreadDashboardView'
import BlueskyClientView from './components/views/BlueskyClientView'
import SkeetForm from './components/SkeetForm'
import ThreadForm from './components/ThreadForm'
import ConfigPanel from './components/ConfigPanel'
import ConfirmDialog from './components/ui/ConfirmDialog'
import { useSkeets } from './hooks/useSkeets'
import { useThreadDetail, useThreads } from './hooks/useThreads'
import { useSse } from './hooks/useSse'
import { formatTime } from './utils/formatTime'
import { getRepeatDescription } from './utils/timeUtils'
import { useToast } from './hooks/useToast'

const PLATFORM_LABELS = {
  bluesky: 'Bluesky',
  mastodon: 'Mastodon'
}

// Einheitliche Picker-Konfiguration für Export-Dateien
const JSON_FILE_PICKER_OPTIONS = {
  types: [
    {
      description: 'JSON',
      accept: { 'application/json': ['.json'] }
    }
  ]
}

/**
 * Speichert einen Blob bevorzugt über das native File-Save-API und fällt bei
 * fehlender Unterstützung auf einen klassischen Download-Link zurück.
 */
async function saveBlobWithPicker (blob, suggestedName) {
  if (typeof window === 'undefined') {
    throw new Error('Speichern ist nur im Browser verfügbar.')
  }

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        ...JSON_FILE_PICKER_OPTIONS
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { filename: handle.name || suggestedName, method: 'picker' }
    } catch (error) {
      if (error?.name === 'AbortError') {
        const abortError = new Error('Speichern abgebrochen')
        abortError.code = 'SAVE_ABORTED'
        throw abortError
      }
      console.warn(
        'showSaveFilePicker fehlgeschlagen, fallback auf Download-Link:',
        error
      )
    }
  }

  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = suggestedName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
  return { filename: suggestedName, method: 'download' }
}

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
  { id: 'config', label: 'Konfiguration', icon: GearIcon }
]

const HEADER_CAPTIONS = {
  overview: 'Übersicht',
  skeets: 'Skeets',
  'skeets-overview': 'Skeets',
  'skeets-plan': 'Skeetplaner',
  threads: 'Threads',
  'threads-overview': 'Threads',
  'threads-plan': 'Threadplaner',
  'bsky-client': 'Bluesky Client',
  config: 'Konfiguration'
}

const HEADER_TITLES = {
  overview: 'Bluesky Kampagnen-Dashboard',
  skeets: 'Skeets',
  'skeets-overview': 'Skeet Übersicht',
  'skeets-plan': 'Skeet planen',
  threads: 'Threads',
  'threads-overview': 'Thread Übersicht',
  'threads-plan': 'Thread planen',
  'bsky-client': 'Direkt-Client',
  config: 'Einstellungen & Automatisierung'
}

const THEMES = ['light', 'dark', 'midnight']
const THEME_CONFIG = {
  light: { label: 'Helles Theme', colorScheme: 'light', icon: SunIcon },
  dark: { label: 'Dunkles Theme', colorScheme: 'dark', icon: MoonIcon },
  midnight: { label: 'Mitternacht', colorScheme: 'dark', icon: ShadowIcon }
}
const DEFAULT_THEME = THEMES[0]

function App () {
  const [activeView, setActiveView] = useState('overview')
  const { config: clientConfigPreset } = useClientConfig()
  const [credsOkOverride, setCredsOkOverride] = useState(false)
  const needsCredentials = Boolean(clientConfigPreset?.needsCredentials)
  const gatedNeedsCreds = needsCredentials && !credsOkOverride
  useEffect(() => {
    if (gatedNeedsCreds) {
      setActiveView('config')
    }
  }, [gatedNeedsCreds])

  // Allow internal navigation events without full reload
  useEffect(() => {
    const handler = (ev) => {
      const view = ev?.detail?.view
      const force = Boolean(ev?.detail?.force)
      if (!view) return
      if (!force && gatedNeedsCreds && view !== 'config') {
        setActiveView('config')
        return
      }
      if (force && view !== 'config') {
        // Nach erfolgreichem Speichern der Zugangsdaten: Gate sofort öffnen
        setCredsOkOverride(true)
      }
      setActiveView(view)
    }
    window.addEventListener('app:navigate', handler)
    return () => window.removeEventListener('app:navigate', handler)
  }, [gatedNeedsCreds])

  // Allow UI to unlock immediately after saving credentials (without reload)
  useEffect(() => {
    const onCredsOk = () => setCredsOkOverride(true)
    window.addEventListener('app:credentials-ok', onCredsOk)
    return () => window.removeEventListener('app:credentials-ok', onCredsOk)
  }, [])
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME
    const stored = window.localStorage.getItem('theme')
    if (stored && THEMES.includes(stored)) {
      return stored
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : DEFAULT_THEME
  })
  const [userHasExplicitTheme, setUserHasExplicitTheme] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('theme')
    return Boolean(stored && THEMES.includes(stored))
  })
  const [editingSkeet, setEditingSkeet] = useState(null)
  const [activeDashboardTab, setActiveDashboardTab] = useState('planned')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false })
  const [editingThreadId, setEditingThreadId] = useState(null)
  const importInputRef = useRef(null)
  const toast = useToast()

  // Live-Updates via SSE: nach Publish/Re-Status sofort aktualisieren
  // Wichtig: Vor useSkeets/useThreads aufrufen, damit sseConnected verfügbar ist.
  const { connected: sseConnected } = useSse({
    onSkeetEvent: async () => {
      try { await refreshSkeetsNow({ force: true }) } catch { /* ignore */ }
    },
    onThreadEvent: async () => {
      try { await refreshThreadsNow({ force: true }) } catch { /* ignore */ }
    },
  })

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
    enabled:
      activeView === 'overview' ||
      activeView === 'skeets' ||
      activeView === 'skeets-overview',
    sseConnected
  })

  const {
    threads,
    loading: threadsLoading,
    error: threadsError,
    refreshNow: refreshThreadsNow
  } = useThreads({
    enabled:
      activeView === 'overview' ||
      activeView === 'threads' ||
      activeView === 'threads-overview',
    sseConnected
  })
  const { thread: editingThread, loading: loadingEditingThread } =
    useThreadDetail(editingThreadId, {
      autoLoad: Boolean(editingThreadId)
    })

  

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
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const resolvedTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME
    const themeSettings = THEME_CONFIG[resolvedTheme]
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.theme = resolvedTheme
    root.style.colorScheme = themeSettings?.colorScheme ?? 'light'
    if (userHasExplicitTheme) {
      window.localStorage.setItem('theme', resolvedTheme)
    } else {
      window.localStorage.removeItem('theme')
    }
  }, [theme, userHasExplicitTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = event => {
      if (!userHasExplicitTheme) {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [userHasExplicitTheme])

  const currentTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME
  const currentThemeConfig = THEME_CONFIG[currentTheme]
  const nextTheme = THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length]
  const nextThemeLabel = THEME_CONFIG[nextTheme]?.label ?? 'Theme wechseln'
  const ThemeIcon = currentThemeConfig?.icon ?? SunIcon

  const handleToggleTheme = () => {
    setUserHasExplicitTheme(true)
    setTheme(current => {
      const currentTheme = THEMES.includes(current) ? current : DEFAULT_THEME
      const currentIndex = THEMES.indexOf(currentTheme)
      const nextIndex = (currentIndex + 1) % THEMES.length
      return THEMES[nextIndex]
    })
  }

  const handleExport = async () => {
    if (typeof window === 'undefined') return

    const isThreadContext = activeView.startsWith('threads')
    const endpoint = isThreadContext
      ? '/api/threads/export'
      : '/api/skeets/export'
    const entityLabel = isThreadContext ? 'Threads' : 'Skeets'
    const fallbackPrefix = isThreadContext ? 'threads' : 'skeets'

    setExporting(true)
    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Fehler beim Export der ${entityLabel}.`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      const fallback = `${fallbackPrefix}-export-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.json`
      const filename = match ? match[1] : fallback
      const saveResult = await saveBlobWithPicker(blob, filename)
      toast.success({
        title: `${entityLabel}-Export bereit`,
        description: `Datei ${saveResult.filename} wurde gespeichert.`
      })
    } catch (error) {
      if (error?.code === 'SAVE_ABORTED') {
        toast.info({
          title: 'Export abgebrochen',
          description: 'Der Speichervorgang wurde abgebrochen.'
        })
      } else {
        console.error(`Fehler beim Export der ${entityLabel}:`, error)
        toast.error({
          title: `${entityLabel}-Export fehlgeschlagen`,
          description:
            error?.message || `Fehler beim Export der ${entityLabel}.`
        })
      }
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      let payload
      try {
        payload = JSON.parse(text)
      } catch (error_) {
        console.error('Ungültiges JSON beim Import der Skeets:', error_)
        throw new Error('Die ausgewählte Datei enthält kein gültiges JSON.')
      }
      // Threads nutzen denselben Dialog, werden aber an ein eigenes Endpoint geschickt.
      const threadContext = activeView.startsWith('threads')
      const endpoint = threadContext
        ? '/api/threads/import'
        : '/api/skeets/import'
      const entityLabel = threadContext ? 'Threads' : 'Skeets'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Fehler beim Import der ${entityLabel}.`)
      }
      if (threadContext) {
        await refreshThreadsNow()
      } else {
        await refreshSkeetsNow()
      }
      toast.success({
        title: `${entityLabel}-Import abgeschlossen`,
        description: `Alle ${entityLabel} wurden erfolgreich importiert.`
      })
    } catch (error) {
      console.error('Fehler beim Import:', error)
      toast.error({
        title: 'Import fehlgeschlagen',
        description: error.message || 'Fehler beim Import.'
      })
    } finally {
      setImporting(false)
      if (event.target) event.target.value = ''
    }
  }

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
    setEditingSkeet(skeet)
    setActiveView('skeets-plan')
  }

  const handleDelete = async skeet => {
    setConfirmDialog({
      open: true,
      title: 'Skeet löschen',
      description: 'Soll dieser geplante Skeet wirklich gelöscht werden?',
      confirmLabel: 'Löschen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/skeets/${skeet.id}`, {
            method: 'DELETE'
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Fehler beim Löschen des Skeets.')
          }
          setEditingSkeet(current =>
            current?.id === skeet.id ? null : current
          )
          await refreshSkeetsNow()
          toast.success({
            title: 'Skeet gelöscht',
            description:
              'Der Skeet wurde gelöscht und kann im Papierkorb reaktiviert werden.'
          })
        } catch (error) {
          console.error('Fehler beim Löschen des Skeets:', error)
          toast.error({
            title: 'Löschen fehlgeschlagen',
            description: error.message || 'Fehler beim Löschen des Skeets.'
          })
        } finally {
          setConfirmDialog(c => ({ ...c, open: false }))
        }
      }
    })
  }

  const handleRetract = async skeet => {
    if (!skeet?.id) return
    setConfirmDialog({
      open: true,
      title: 'Skeet entfernen',
      description:
        'Soll dieser veröffentlichte Skeet auf den Plattformen gelöscht werden?',
      confirmLabel: 'Entfernen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/skeets/${skeet.id}/retract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Fehler beim Entfernen des Skeets.')
          }
          const data = await res.json()
          await refreshSkeetsNow()
          const summary = data?.summary || {}
          const successPlatforms = Object.entries(summary)
            .filter(([, result]) => result?.ok)
            .map(([platformId]) => PLATFORM_LABELS[platformId] || platformId)
          const failedPlatforms = Object.entries(summary)
            .filter(([, result]) => result && result.ok === false)
            .map(([platformId]) => PLATFORM_LABELS[platformId] || platformId)
          const parts = []
          if (successPlatforms.length) {
            parts.push(`Erfolgreich entfernt: ${successPlatforms.join(', ')}`)
          }
          if (failedPlatforms.length) {
            parts.push(`Fehlgeschlagen: ${failedPlatforms.join(', ')}`)
          }
          toast.success({
            title: 'Skeet entfernt',
            description:
              parts.join(' · ') ||
              'Der Skeet wurde auf allen Plattformen entfernt.'
          })
        } catch (error) {
          console.error('Fehler beim Entfernen des Skeets:', error)
          toast.error({
            title: 'Entfernen fehlgeschlagen',
            description: error.message || 'Fehler beim Entfernen des Skeets.'
          })
        } finally {
          setConfirmDialog(c => ({ ...c, open: false }))
        }
      }
    })
  }

  const handleRestore = async skeet => {
    try {
      const res = await fetch(`/api/skeets/${skeet.id}/restore`, {
        method: 'POST'
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Fehler beim Reaktivieren des Skeets.')
      }
      const restored = await res.json().catch(() => null)
      await refreshSkeetsNow({ force: true })
      // Navigationslogik: Wenn noch Termin vorhanden, nur auf "Geplant" wechseln,
      // sonst direkt zur Karte scrollen.
      setActiveView('skeets-overview')
      setActiveDashboardTab('planned')
      const targetId = restored?.id || skeet.id
      const hasSchedule = Boolean(restored?.scheduledAt)
      if (!hasSchedule) {
        setTimeout(() => {
          try {
            const el = document.getElementById(`skeet-${targetId}`)
            if (el && typeof el.scrollIntoView === 'function') {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          } catch (e) {
            console.error(
              'Fehler beim Scrollen zum wiederhergestellten Skeet:',
              e
            )
          }
        }, 80)
      }
      toast.success({
        title: 'Skeet reaktiviert',
        description:
          'Der Skeet wurde wiederhergestellt und erscheint erneut in der Skeet Übersicht.'
      })
    } catch (error) {
      console.error('Fehler beim Reaktivieren des Skeets:', error)
      toast.error({
        title: 'Reaktivierung fehlgeschlagen',
        description: error.message || 'Fehler beim Reaktivieren des Skeets.'
      })
    }
  }

  const handlePermanentDelete = async skeet => {
    setConfirmDialog({
      open: true,
      title: 'Skeet endgültig löschen',
      description: 'Dieser Vorgang kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Endgültig löschen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/skeets/${skeet.id}?permanent=1`, {
            method: 'DELETE'
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(
              data.error || 'Fehler beim endgültigen Löschen des Skeets.'
            )
          }
          setEditingSkeet(current =>
            current?.id === skeet.id ? null : current
          )
          await refreshSkeetsNow()
          toast.success({
            title: 'Skeet entfernt',
            description: 'Der Skeet wurde dauerhaft gelöscht.'
          })
        } catch (error) {
          console.error('Fehler beim endgültigen Löschen des Skeets:', error)
          toast.error({
            title: 'Endgültiges Löschen fehlgeschlagen',
            description:
              error.message || 'Fehler beim endgültigen Löschen des Skeets.'
          })
        } finally {
          setConfirmDialog(c => ({ ...c, open: false }))
        }
      }
    })
  }

  const handleEditThread = thread => {
    setEditingThreadId(thread?.id ?? null)
    setActiveView('threads-plan')
  }

  const handleDeleteThread = async thread => {
    if (!thread?.id) return
    const label = thread.title || `Thread #${thread.id}`
    setConfirmDialog({
      open: true,
      title: 'Thread löschen',
      description: `Soll "${label}" wirklich gelöscht werden?`,
      confirmLabel: 'Löschen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/threads/${thread.id}`, {
            method: 'DELETE'
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Fehler beim Löschen des Threads.')
          }

          if (editingThreadId === thread.id) {
            setEditingThreadId(null)
          }

          await refreshThreadsNow()

          toast.success({
            title: 'Thread gelöscht',
            description: 'Der Thread wurde entfernt.'
          })
        } catch (error) {
          console.error('Fehler beim Löschen des Threads:', error)
          toast.error({
            title: 'Löschen fehlgeschlagen',
            description: error.message || 'Fehler beim Löschen des Threads.'
          })
        } finally {
          setConfirmDialog(c => ({ ...c, open: false }))
        }
      }
    })
  }

  const handleRetractThread = async thread => {
    if (!thread?.id) return
    const label = thread.title || `Thread #${thread.id}`
    setConfirmDialog({
      open: true,
      title: 'Thread entfernen',
      description: `Soll "${label}" auf allen Plattformen gelöscht werden?`,
      confirmLabel: 'Entfernen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/threads/${thread.id}/retract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Fehler beim Entfernen des Threads.')
          }

          const data = await res.json()
          await refreshThreadsNow()

          const summary = data?.summary || {}
          const successPlatforms = Object.entries(summary)
            .filter(([, result]) => result?.ok)
            .map(([platformId]) => PLATFORM_LABELS[platformId] || platformId)
          const failedPlatforms = Object.entries(summary)
            .filter(([, result]) => result && result.ok === false)
            .map(([platformId]) => PLATFORM_LABELS[platformId] || platformId)
          const parts = []
          if (successPlatforms.length) {
            parts.push(`Erfolgreich entfernt: ${successPlatforms.join(', ')}`)
          }
          if (failedPlatforms.length) {
            parts.push(`Fehlgeschlagen: ${failedPlatforms.join(', ')}`)
          }

          toast.success({
            title: 'Thread entfernt',
            description:
              parts.join(' · ') ||
              'Der Thread wurde auf allen Plattformen entfernt.'
          })
        } catch (error) {
          console.error('Fehler beim Entfernen des Threads:', error)
          toast.error({
            title: 'Entfernen fehlgeschlagen',
            description: error.message || 'Fehler beim Entfernen des Threads.'
          })
        } finally {
          setConfirmDialog(c => ({ ...c, open: false }))
        }
      }
    })
  }

  const handleRestoreThread = async thread => {
    if (!thread?.id) return
    try {
      const res = await fetch(`/api/threads/${thread.id}/restore`, {
        method: 'POST'
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error || 'Fehler beim Wiederherstellen des Threads.'
        )
      }
      const restored = await res.json().catch(() => null)
      await refreshThreadsNow({ force: true })
      // Navigationslogik: Wenn noch Termin vorhanden, nur auf "Geplant" wechseln,
      // sonst direkt zur Karte scrollen.
      setActiveView('threads-overview')
      const targetId = restored?.id || thread.id
      const hasSchedule = Boolean(restored?.scheduledAt)
      if (!hasSchedule) {
        setTimeout(() => {
          try {
            const el = document.getElementById(`thread-${targetId}`)
            if (el && typeof el.scrollIntoView === 'function') {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          } catch (e) {
            console.error(
              'Fehler beim Scrollen zum wiederhergestellten Thread:',
              e
            )
          }
        }, 80)
      }
      toast.success({
        title: 'Thread reaktiviert',
        description: 'Der Thread wurde wiederhergestellt.'
      })
    } catch (error) {
      console.error('Fehler beim Wiederherstellen des Threads:', error)
      toast.error({
        title: 'Wiederherstellung fehlgeschlagen',
        description:
          error.message || 'Fehler beim Wiederherstellen des Threads.'
      })
    }
  }

  const handleDestroyThread = async thread => {
    if (!thread?.id) return
    const label = thread.title || `Thread #${thread.id}`
    setConfirmDialog({
      open: true,
      title: 'Thread endgültig löschen',
      description: `Soll "${label}" endgültig gelöscht werden? Dieser Vorgang kann nicht rückgängig gemacht werden.`,
      confirmLabel: 'Endgültig löschen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/threads/${thread.id}?permanent=1`, {
            method: 'DELETE'
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(
              data.error || 'Fehler beim endgültigen Löschen des Threads.'
            )
          }

          if (editingThreadId === thread.id) {
            setEditingThreadId(null)
          }

          await refreshThreadsNow()

          toast.success({
            title: 'Thread entfernt',
            description: 'Der Thread wurde dauerhaft gelöscht.'
          })
        } catch (error) {
          console.error('Fehler beim endgültigen Löschen des Threads:', error)
          toast.error({
            title: 'Endgültiges Löschen fehlgeschlagen',
            description:
              error.message || 'Fehler beim endgültigen Löschen des Threads.'
          })
        } finally {
          setConfirmDialog(c => ({ ...c, open: false }))
        }
      }
    })
  }

  const handleFormSaved = async () => {
    setEditingSkeet(null)
    // Zuerst in die Übersicht wechseln, dann gezielt refreshen
    setActiveView('skeets-overview')
    setActiveDashboardTab('planned')
    await new Promise(r => setTimeout(r, 0))
    await refreshSkeetsNow({ force: true })
  }

  const handleThreadSaved = async () => {
    setEditingThreadId(null)
    setActiveView('threads-overview')
    await new Promise(r => setTimeout(r, 0))
    await refreshThreadsNow({ force: true })
  }

  const handleThreadCancel = () => {
    setEditingThreadId(null)
    setActiveView('threads-overview')
    toast.info({
      title: 'Bearbeitung abgebrochen',
      description: 'Der Thread wurde nicht verändert.'
    })
  }

  const handleCancelEdit = () => {
    setEditingSkeet(null)
    setActiveView('skeets-overview')
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
        onClick={handleToggleTheme}
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
    content = <ConfigPanel />
  } else if (activeView === 'overview') {
    content = (
      <MainOverviewView
        threads={threads}
        plannedSkeets={plannedSkeets}
        publishedSkeets={publishedSkeets}
        onOpenSkeetsOverview={() => setActiveView('skeets-overview')}
        onOpenThreadsOverview={() => setActiveView('threads-overview')}
      />
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
      <DashboardView
        plannedSkeets={plannedSkeets}
        publishedSkeets={publishedSkeets}
        deletedSkeets={deletedSkeets}
        onEditSkeet={handleEdit}
        onDeleteSkeet={handleDelete}
        onRetractSkeet={handleRetract}
        onRestoreSkeet={handleRestore}
        onPermanentDeleteSkeet={handlePermanentDelete}
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
      />
    )
  } else if (activeView === 'threads-overview') {
    content = (
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
    )
  } else if (activeView === 'config') {
    content = <ConfigPanel />
  } else if (activeView === 'bsky-client') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <BlueskyClientView />
      </Card>
    )
  } else if (activeView === 'skeets-plan') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <SkeetForm
          onSkeetSaved={handleFormSaved}
          editingSkeet={editingSkeet}
          onCancelEdit={handleCancelEdit}
        />
      </Card>
    )
  } else if (activeView === 'threads-plan') {
    content = (
      <Card padding='p-6 lg:p-10'>
        <ThreadForm
          key={editingThreadId || 'new'}
          initialThread={editingThreadId ? editingThread : null}
          loading={Boolean(
            editingThreadId && loadingEditingThread && !editingThread
          )}
          onThreadSaved={handleThreadSaved}
          onCancel={editingThreadId ? handleThreadCancel : undefined}
        />
      </Card>
    )
  }

  const safeSelectView = (viewId) => {
    if (needsCredentials && viewId !== 'config') {
      setActiveView('config')
      return
    }
    setActiveView(viewId)
  }

  return (
    <AppLayout
      navItems={availableNavItems}
      activeView={activeView}
      onSelectView={safeSelectView}
      headerCaption={headerCaption}
      headerTitle={headerTitle}
      headerActions={headerActions}
    >
      {content}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel || 'Abbrechen'}
        variant={confirmDialog.variant || 'primary'}
        onConfirm={
          confirmDialog.onConfirm ||
          (() => setConfirmDialog(c => ({ ...c, open: false })))
        }
        onCancel={() => setConfirmDialog(c => ({ ...c, open: false }))}
      />
    </AppLayout>
  )
}

export default App
