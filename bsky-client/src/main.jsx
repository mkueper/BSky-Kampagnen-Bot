import React from 'react'
import { createRoot } from 'react-dom/client'
import ClientApp from './ClientApp'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from '@bsky-kampagnen-bot/shared-ui'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <ToastProvider>
      <AppProvider>
        <ClientApp />
      </AppProvider>
    </ToastProvider>
  </React.StrictMode>
)
