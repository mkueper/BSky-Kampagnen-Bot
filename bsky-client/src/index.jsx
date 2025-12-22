import { useEffect, useRef } from 'react'
import ClientApp from './ClientApp.jsx'
import { AppProvider, useAppDispatch, useAppState } from './context/AppContext.jsx'
import { SWRConfig } from 'swr'
import { fetcher } from './lib/fetcher.js'
import { HashRouter } from 'react-router-dom'
import { ToastProvider, ThemeProvider, useToast } from '@bsky-kampagnen-bot/shared-ui'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import { AuthProvider } from './modules/auth/AuthContext.jsx'

function DebugRenderDispatchToast () {
  const toast = useToast()
  const lastNoticeRef = useRef(0)
  const isDev = Boolean(import.meta?.env?.DEV)

  useEffect(() => {
    const handler = () => {
      const now = Date.now()
      if (now - lastNoticeRef.current < 2500) return
      lastNoticeRef.current = now
      toast.info({
        title: 'Debug-Hinweis',
        description: 'Dispatch waehrend Render erkannt und protokolliert.'
      })
    }
    window.addEventListener('bsky:debug:dispatch-during-render', handler)
    return () => window.removeEventListener('bsky:debug:dispatch-during-render', handler)
  }, [toast])

  useEffect(() => {
    if (!isDev || typeof window === 'undefined') return undefined
    const storageKey = 'bsky-debug:dispatch-during-render'
    const downloadLog = () => {
      try {
        const raw = window.localStorage.getItem(storageKey)
        const payload = raw ? JSON.stringify(JSON.parse(raw), null, 2) : '[]'
        const blob = new Blob([payload], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'bsky-render-dispatch-log.json'
        anchor.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        console.warn('[Debug] Render-dispatch log download failed.', error)
      }
    }
    window.bskyDownloadRenderDispatchLog = downloadLog
    return () => {
      if (window.bskyDownloadRenderDispatchLog === downloadLog) {
        delete window.bskyDownloadRenderDispatchLog
      }
    }
  }, [isDev])

  return null
}

export default function BskyClientRoot (props) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DebugRenderDispatchToast />
        <I18nProvider initialLocale='de'>
          <SWRConfig value={{
            fetcher,
            dedupingInterval: 1000,
            focusThrottleInterval: 2000,
            errorRetryCount: 2
          }}>
            <HashRouter>
              <AuthProvider>
                <AppProvider>
                  <ClientApp {...props} />
                </AppProvider>
              </AuthProvider>
            </HashRouter>
          </SWRConfig>
        </I18nProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export { ClientApp, AppProvider, useAppDispatch, useAppState }
