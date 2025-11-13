import ClientApp from './ClientApp.jsx'
import { AppProvider, useAppDispatch, useAppState } from './context/AppContext.jsx'

export default function BskyClientRoot (props) {
  return (
    <AppProvider>
      <ClientApp {...props} />
    </AppProvider>
  )
}

export { ClientApp, AppProvider, useAppDispatch, useAppState }
