import { createContext, useContext, useReducer } from 'react'
import {
  composerInitialState,
  composerReducer
} from './reducers/composer.js'

const ComposerStateContext = createContext(null)
const ComposerDispatchContext = createContext(null)

export function ComposerProvider ({ children }) {
  const [state, dispatch] = useReducer(composerReducer, composerInitialState)
  return (
    <ComposerStateContext.Provider value={state}>
      <ComposerDispatchContext.Provider value={dispatch}>
        {children}
      </ComposerDispatchContext.Provider>
    </ComposerStateContext.Provider>
  )
}

export function useComposerState () {
  const context = useContext(ComposerStateContext)
  if (context === null) {
    throw new Error('useComposerState must be used within a ComposerProvider')
  }
  return context
}

export function useComposerDispatch () {
  const context = useContext(ComposerDispatchContext)
  if (context === null) {
    throw new Error('useComposerDispatch must be used within a ComposerProvider')
  }
  return context
}
