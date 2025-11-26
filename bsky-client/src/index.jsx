import ClientApp from './ClientApp.jsx'
import { AppProvider, useAppDispatch, useAppState } from './context/AppContext.jsx'
import { SWRConfig } from 'swr'
import { fetcher } from './lib/fetcher.js'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from '@bsky-kampagnen-bot/shared-ui'

export default function BskyClientRoot (props) {
  return (
    <ToastProvider>
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
    </ToastProvider>
  )
}

export { ClientApp, AppProvider, useAppDispatch, useAppState }
