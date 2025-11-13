import { useCallback } from 'react'

export function useThreadActions ({
  toast,
  refreshThreadsNow,
  setEditingThreadId,
  navigate,
  openConfirm,
  platformLabels = {}
}) {
  const handleDeleteThread = useCallback((thread) => {
    if (!thread?.id) return
    const label = thread.title || `Thread #${thread.id}`
    openConfirm({
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
          setEditingThreadId(current => (current === thread.id ? null : current))
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
        }
      }
    })
  }, [openConfirm, refreshThreadsNow, setEditingThreadId, toast])

  const handleRetractThread = useCallback((thread) => {
    if (!thread?.id) return
    const label = thread.title || `Thread #${thread.id}`
    openConfirm({
      title: 'Veröffentlichung zurückziehen',
      description: `Soll "${label}" auf allen Plattformen zurückgezogen werden?`,
      confirmLabel: 'Zurückziehen',
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
            .map(([platformId]) => platformLabels[platformId] || platformId)
          const failedPlatforms = Object.entries(summary)
            .filter(([, result]) => result && result.ok === false)
            .map(([platformId]) => platformLabels[platformId] || platformId)
          const parts = []
          if (successPlatforms.length) {
            parts.push(`Erfolgreich zurückgezogen: ${successPlatforms.join(', ')}`)
          }
          if (failedPlatforms.length) {
            parts.push(`Fehlgeschlagen: ${failedPlatforms.join(', ')}`)
          }

          toast.success({
            title: 'Thread zurückgezogen',
            description: parts.join(' · ') || 'Der Thread wurde auf allen Plattformen zurückgezogen.'
          })
        } catch (error) {
          console.error('Fehler beim Entfernen des Threads:', error)
          toast.error({
            title: 'Zurückziehen fehlgeschlagen',
            description: error.message || 'Fehler beim Zurückziehen des Threads.'
          })
        }
      }
    })
  }, [openConfirm, platformLabels, refreshThreadsNow, toast])

  const handleDestroyThread = useCallback((thread) => {
    if (!thread?.id) return
    const label = thread.title || `Thread #${thread.id}`
    openConfirm({
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

          setEditingThreadId(current => (current === thread.id ? null : current))
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
        }
      }
    })
  }, [openConfirm, refreshThreadsNow, setEditingThreadId, toast])

  const handleRestoreThread = useCallback(async (thread) => {
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
      navigate('threads-overview')
      const targetId = restored?.id || thread.id
      const hasSchedule = Boolean(restored?.scheduledAt)
      if (!hasSchedule) {
        setTimeout(() => {
          try {
            const el = document.getElementById(`thread-${targetId}`)
            if (el?.scrollIntoView) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          } catch (error) {
            console.error('Fehler beim Scrollen zum wiederhergestellten Thread:', error)
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
  }, [navigate, refreshThreadsNow, toast])

  return {
    handleDeleteThread,
    handleRetractThread,
    handleDestroyThread,
    handleRestoreThread
  }
}
