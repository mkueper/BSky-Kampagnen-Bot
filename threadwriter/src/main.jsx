import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './theme.css'

const el = document.getElementById('root')
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
