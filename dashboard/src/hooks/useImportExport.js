import { useCallback, useRef, useState } from 'react'

const JSON_FILE_PICKER_OPTIONS = {
  types: [
    {
      description: 'JSON',
      accept: { 'application/json': ['.json'] }
    }
  ]
}

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

export function useImportExport ({
  activeView,
  refreshSkeetsNow,
  refreshThreadsNow,
  toast
}) {
  const importInputRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (typeof window === 'undefined') return
    const isThreadContext = activeView.startsWith('threads')
    const endpoint = isThreadContext ? '/api/threads/export' : '/api/skeets/export'
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
      const fallback = `${fallbackPrefix}-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
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
          description: error?.message || `Fehler beim Export der ${entityLabel}.`
        })
      }
    } finally {
      setExporting(false)
    }
  }, [activeView, toast])

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click()
  }, [])

  const handleImportFileChange = useCallback(async (event) => {
    const file = event?.target?.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      let payload
      try {
        payload = JSON.parse(text)
      } catch (parseError) {
        console.error('Ungültiges JSON beim Import:', parseError)
        throw new Error('Die ausgewählte Datei enthält kein gültiges JSON.')
      }
      const threadContext = activeView.startsWith('threads')
      const endpoint = threadContext ? '/api/threads/import' : '/api/skeets/import'
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
      if (event?.target) event.target.value = ''
    }
  }, [activeView, refreshThreadsNow, refreshSkeetsNow, toast])

  return {
    exporting,
    importing,
    handleExport,
    handleImportClick,
    handleImportFileChange,
    importInputRef
  }
}
