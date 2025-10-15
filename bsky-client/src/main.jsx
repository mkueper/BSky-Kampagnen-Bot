import React from 'react'
import { createRoot } from 'react-dom/client'
import ClientApp from './ClientApp'
import { CardConfigProvider } from './context/CardConfigContext'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <CardConfigProvider>
      <ClientApp />
    </CardConfigProvider>
  </React.StrictMode>
)
