import React from 'react'
import { createRoot } from 'react-dom/client'
import ClientApp from './ClientApp'
import { SWRConfig } from 'swr'
import { fetcher } from './lib/fetcher'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from '@bsky-kampagnen-bot/shared-ui'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <ToastProvider>
      <SWRConfig value={{
        fetcher,
        dedupingInterval: 1000,
        focusThrottleInterval: 2000,
        errorRetryCount: 2
      }}>
        <AppProvider>
          <ClientApp />
        </AppProvider>
      </SWRConfig>
    </ToastProvider>
  </React.StrictMode>
)
