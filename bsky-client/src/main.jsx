import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import React from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import BskyClientRoot from './index.jsx'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)

root.render(
  <React.StrictMode>
    <BskyClientRoot />
  </React.StrictMode>
)
