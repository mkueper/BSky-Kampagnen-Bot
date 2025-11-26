import ClientApp from './ClientApp.jsx'
import { AppProvider, useAppDispatch, useAppState } from './context/AppContext.jsx'
import { SWRConfig } from 'swr'
import { fetcher } from './lib/fetcher.js'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from '@bsky-kampagnen-bot/shared-ui'
import { I18nProvider } from './i18n/I18nProvider.jsx'

export default function BskyClientRoot (props) {
  return (
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
              <ClientApp {...props} />
            </AppProvider>
          </HashRouter>
        </SWRConfig>
      </I18nProvider>
    </ToastProvider>
  )
}

export { ClientApp, AppProvider, useAppDispatch, useAppState }
