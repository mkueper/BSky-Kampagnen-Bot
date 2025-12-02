import React from 'react'
import { createRoot } from 'react-dom/client'
import ClientApp from './ClientApp'
import { SWRConfig } from 'swr'
import { fetcher } from './lib/fetcher'
import { AppProvider } from './context/AppContext'
import { ToastProvider, ThemeProvider } from '@bsky-kampagnen-bot/shared-ui'
import { HashRouter } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nProvider.jsx'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <I18nProvider initialLocale='de'>
          <SWRConfig value={{
            fetcher,
            dedupingInterval: 1000,
            focusThrottleInterval: 2000,
            errorRetryCount: 2
          }}>
            <HashRouter>
              <AppProvider>
                <ClientApp />
              </AppProvider>
            </HashRouter>
          </SWRConfig>
        </I18nProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
)
