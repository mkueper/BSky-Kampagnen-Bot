import React from 'react'
import { createRoot } from 'react-dom/client'
import ClientApp from './ClientApp'
import { AppProvider } from './context/AppContext'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <AppProvider>
      <ClientApp />
    </AppProvider>
  </React.StrictMode>
)
