import { useCallback } from 'react'

export function useSkeetActions ({
  toast,
  refreshSkeetsNow,
  setEditingSkeet,
  navigate,
  setActiveDashboardTab,
  openConfirm,
  platformLabels = {}
}) {
  const handleDelete = useCallback((skeet) => {
    if (!skeet?.id) return
    openConfirm({
      title: 'Skeet löschen',
      description: 'Soll dieser geplante Skeet wirklich gelöscht werden?',
      confirmLabel: 'Löschen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/skeets/${skeet.id}`, { method: 'DELETE' })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Fehler beim Löschen des Skeets.')
          }
          setEditingSkeet(current => (current?.id === skeet.id ? null : current))
          await refreshSkeetsNow()
          toast.success({
            title: 'Skeet gelöscht',
            description: 'Der Skeet wurde gelöscht und kann im Papierkorb reaktiviert werden.'
          })
        } catch (error) {
          console.error('Fehler beim Löschen des Skeets:', error)
          toast.error({
            title: 'Löschen fehlgeschlagen',
            description: error.message || 'Fehler beim Löschen des Skeets.'
          })
        }
      }
    })
  }, [openConfirm, refreshSkeetsNow, setEditingSkeet, toast])

  const handleRetract = useCallback((skeet) => {
    if (!skeet?.id) return
    openConfirm({
      title: 'Veröffentlichung zurückziehen',
      description: 'Soll dieser veröffentlichte Skeet von den Plattformen zurückgezogen werden?',
      confirmLabel: 'Zurückziehen',
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
            title: 'Skeet zurückgezogen',
            description: parts.join(' · ') || 'Der Skeet wurde auf allen Plattformen zurückgezogen.'
          })
        } catch (error) {
          console.error('Fehler beim Entfernen des Skeets:', error)
          toast.error({
            title: 'Zurückziehen fehlgeschlagen',
            description: error.message || 'Fehler beim Zurückziehen des Skeets.'
          })
        }
      }
    })
  }, [openConfirm, refreshSkeetsNow, toast, platformLabels])

  const handlePermanentDelete = useCallback((skeet) => {
    if (!skeet?.id) return
    openConfirm({
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
            throw new Error(data.error || 'Fehler beim endgültigen Löschen des Skeets.')
          }
          setEditingSkeet(current => (current?.id === skeet.id ? null : current))
          await refreshSkeetsNow()
          toast.success({
            title: 'Skeet entfernt',
            description: 'Der Skeet wurde dauerhaft gelöscht.'
          })
        } catch (error) {
          console.error('Fehler beim endgültigen Löschen des Skeets:', error)
          toast.error({
            title: 'Endgültiges Löschen fehlgeschlagen',
            description: error.message || 'Fehler beim endgültigen Löschen des Skeets.'
          })
        }
      }
    })
  }, [openConfirm, refreshSkeetsNow, setEditingSkeet, toast])

  const handleRestore = useCallback(async (skeet) => {
    if (!skeet?.id) return
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
      navigate('skeets-overview')
      setActiveDashboardTab('planned')
      const targetId = restored?.id || skeet.id
      const hasSchedule = Boolean(restored?.scheduledAt)
      if (!hasSchedule) {
        setTimeout(() => {
          try {
            const el = document.getElementById(`skeet-${targetId}`)
            if (el?.scrollIntoView) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          } catch (error) {
            console.error('Fehler beim Scrollen zum wiederhergestellten Skeet:', error)
          }
        }, 80)
      }
      toast.success({
        title: 'Skeet reaktiviert',
        description: 'Der Skeet wurde wiederhergestellt und erscheint erneut in der Skeet Übersicht.'
      })
    } catch (error) {
      console.error('Fehler beim Reaktivieren des Skeets:', error)
      toast.error({
        title: 'Reaktivierung fehlgeschlagen',
        description: error.message || 'Fehler beim Reaktivieren des Skeets.'
      })
    }
  }, [navigate, refreshSkeetsNow, setActiveDashboardTab, toast])

  return {
    handleDelete,
    handleRetract,
    handlePermanentDelete,
    handleRestore
  }
}
