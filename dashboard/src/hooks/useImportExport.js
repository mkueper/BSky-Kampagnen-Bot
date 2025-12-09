import { useCallback, useRef, useState } from 'react'
import { useTranslation } from '../i18n/I18nProvider.jsx'

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
  const { t } = useTranslation()
  const importInputRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const mapExportErrorMessage = useCallback(
    (data, { isThreadContext, defaultMessage }) => {
      const code = typeof data?.code === 'string' ? data.code : null
      const backendMessage =
        typeof data?.message === 'string' ? data.message : null
      const backendErrorField =
        typeof data?.error === 'string' ? data.error : null

      if (code === 'IMPORT_EXPORT_SKEETS_EXPORT_FAILED') {
        return t(
          'importExport.errors.skeetsExportFailed',
          'Fehler beim Export der Posts.'
        )
      }
      if (code === 'IMPORT_EXPORT_THREADS_EXPORT_FAILED') {
        return t(
          'importExport.errors.threadsExportFailed',
          'Fehler beim Export der Threads.'
        )
      }

      if (backendMessage) return backendMessage
      if (backendErrorField && backendErrorField !== code) {
        return backendErrorField
      }
      if (code) return code

      return isThreadContext
        ? t(
            'importExport.errors.genericExportFailed',
            defaultMessage || 'Fehler beim Export der Threads.'
          )
        : t(
            'importExport.errors.genericExportFailed',
            defaultMessage || 'Fehler beim Export der Posts.'
          )
    },
    [t]
  )

  const mapImportErrorMessage = useCallback(
    (data, { isThreadContext, defaultMessage }) => {
      const code = typeof data?.code === 'string' ? data.code : null
      const backendMessage =
        typeof data?.message === 'string' ? data.message : null
      const backendErrorField =
        typeof data?.error === 'string' ? data.error : null

      if (code === 'IMPORT_EXPORT_SKEETS_IMPORT_FAILED') {
        return t(
          'importExport.errors.skeetsImportFailed',
          'Fehler beim Import der Posts.'
        )
      }
      if (code === 'IMPORT_EXPORT_THREADS_IMPORT_FAILED') {
        return t(
          'importExport.errors.threadsImportFailed',
          'Fehler beim Import der Threads.'
        )
      }

      if (backendMessage) return backendMessage
      if (backendErrorField && backendErrorField !== code) {
        return backendErrorField
      }
      if (code) return code

      return isThreadContext
        ? t(
            'importExport.errors.genericImportFailed',
            defaultMessage || 'Fehler beim Import der Threads.'
          )
        : t(
            'importExport.errors.genericImportFailed',
            defaultMessage || 'Fehler beim Import der Posts.'
          )
    },
    [t]
  )

  const handleExport = useCallback(async () => {
    if (typeof window === 'undefined') return
    const isThreadContext = activeView.startsWith('threads')
    const endpoint = isThreadContext ? '/api/threads/export' : '/api/skeets/export'
    const entityLabel = isThreadContext
      ? t('importExport.labels.threads', 'Threads')
      : t('importExport.labels.posts', 'Posts')
    const fallbackPrefix = isThreadContext ? 'threads' : 'posts'

    setExporting(true)
    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const defaultMessage = isThreadContext
          ? `Fehler beim Export der ${entityLabel}.`
          : `Fehler beim Export der ${entityLabel}.`
        const message = mapExportErrorMessage(data, {
          isThreadContext,
          defaultMessage
        })
        const error = new Error(message)
        error.code = data?.code
        error.data = data
        throw error
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      const fallback = `${fallbackPrefix}-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const filename = match ? match[1] : fallback
      const saveResult = await saveBlobWithPicker(blob, filename)
      toast.success({
        title: isThreadContext
          ? t(
              'importExport.success.threadsExportReadyTitle',
              `${entityLabel}-Export bereit`
            )
          : t(
              'importExport.success.skeetsExportReadyTitle',
              `${entityLabel}-Export bereit`
            ),
        description: t(
          'importExport.success.fileSaved',
          `Datei ${saveResult.filename} wurde gespeichert.`,
          { filename: saveResult.filename }
        )
      })
    } catch (error) {
      if (error?.code === 'SAVE_ABORTED') {
        toast.info({
          title: t(
            'importExport.success.exportAbortedTitle',
            'Export abgebrochen'
          ),
          description: t(
            'importExport.success.exportAbortedDescription',
            'Der Speichervorgang wurde abgebrochen.'
          )
        })
      } else {
        console.error(`Fehler beim Export der ${entityLabel}:`, error)
        toast.error({
          title: `${entityLabel}-Export fehlgeschlagen`,
          description:
            error?.message ||
            mapExportErrorMessage(error?.data, {
              isThreadContext,
              defaultMessage: isThreadContext
                ? `Fehler beim Export der ${entityLabel}.`
                : `Fehler beim Export der ${entityLabel}.`
            })
        })
      }
    } finally {
      setExporting(false)
    }
  }, [activeView, mapExportErrorMessage, t, toast])

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
        throw new Error(
          t(
            'importExport.errors.invalidJson',
            'Die ausgewählte Datei enthält kein gültiges JSON.'
          )
        )
      }
      const threadContext = activeView.startsWith('threads')
      const endpoint = threadContext ? '/api/threads/import' : '/api/skeets/import'
      const entityLabel = threadContext
        ? t('importExport.labels.threads', 'Threads')
        : t('importExport.labels.posts', 'Posts')

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const defaultMessage = threadContext
          ? `Fehler beim Import der ${entityLabel}.`
          : `Fehler beim Import der ${entityLabel}.`
        const message = mapImportErrorMessage(data, {
          isThreadContext: threadContext,
          defaultMessage
        })
        const error = new Error(message)
        error.code = data?.code
        error.data = data
        throw error
      }
      if (threadContext) {
        await refreshThreadsNow()
      } else {
        await refreshSkeetsNow()
      }
      toast.success({
        title: threadContext
          ? t(
              'importExport.success.threadsImportDoneTitle',
              `${entityLabel}-Import abgeschlossen`
            )
          : t(
              'importExport.success.skeetsImportDoneTitle',
              `${entityLabel}-Import abgeschlossen`
            ),
        description: t(
          'importExport.success.genericImportSuccess',
          `Alle ${entityLabel} wurden erfolgreich importiert.`
        )
      })
    } catch (error) {
      console.error('Fehler beim Import:', error)
      toast.error({
        title: 'Import fehlgeschlagen',
        description:
          error?.message ||
          mapImportErrorMessage(error?.data, {
            isThreadContext: activeView.startsWith('threads'),
            defaultMessage: 'Fehler beim Import.'
          })
      })
    } finally {
      setImporting(false)
      if (event?.target) event.target.value = ''
    }
  }, [
    activeView,
    mapImportErrorMessage,
    refreshThreadsNow,
    refreshSkeetsNow,
    t,
    toast
  ])

  return {
    exporting,
    importing,
    handleExport,
    handleImportClick,
    handleImportFileChange,
    importInputRef
  }
}
