import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './styles/tailwind.css'
// Styles für emoji-mart Picker (vanilla)
// Hinweis: emoji-mart v5 benötigt keine separate CSS-Datei im Dashboard
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider, ThemeProvider } from '@bsky-kampagnen-bot/shared-ui'
import { installFetchInterceptor } from './utils/installFetchInterceptor'

if (!document.documentElement.dataset.styleVariant) {
  document.documentElement.dataset.styleVariant = 'classic'
}

installFetchInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
)
