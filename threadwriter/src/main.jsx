import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './theme.css'

const el = document.getElementById('root')
// Disable common reload/devtools shortcuts in the webview for accessibility consistency
window.addEventListener('keydown', (e) => {
  try {
    const isReload = e.key === 'F5' || (e.key?.toLowerCase?.() === 'r' && (e.ctrlKey || e.metaKey))
    const isDevTools = (e.shiftKey && (e.ctrlKey || e.metaKey) && (e.key?.toLowerCase?.() === 'i'))
    if (isReload || isDevTools) {
      e.preventDefault()
      e.stopPropagation()
    }
  } catch {}
}, { capture: true })
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
