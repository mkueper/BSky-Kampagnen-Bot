import React from 'react'
import { createRoot } from 'react-dom/client'
import ClientApp from './ClientApp'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <ClientApp />
  </React.StrictMode>
)

