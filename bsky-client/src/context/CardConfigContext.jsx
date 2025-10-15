import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'

const DEFAULTS = {
  mode: 'flex', // 'flex' | 'fixed'
  singleMax: 360,
  multiMax: 180
}

const CardConfigContext = createContext({
  config: DEFAULTS,
  setConfig: () => {}
})


export function CardConfigProvider ({ children }) {
  const [config, setConfig] = useState(DEFAULTS)

  useEffect(() => {
    try {
      const mode = window.localStorage.getItem('bsky.cardMode') || DEFAULTS.mode
      const singleMax = parseInt(window.localStorage.getItem('bsky.cardSingleMax') || `${DEFAULTS.singleMax}`, 10)
      const multiMax = parseInt(window.localStorage.getItem('bsky.cardMultiMax') || `${DEFAULTS.multiMax}`, 10)
      setConfig({
        mode: mode === 'fixed' ? 'fixed' : 'flex',
        singleMax: Number.isFinite(singleMax) ? singleMax : DEFAULTS.singleMax,
        multiMax: Number.isFinite(multiMax) ? multiMax : DEFAULTS.multiMax
      })
    } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({
    config,
    setConfig: (next) => {
      setConfig(prev => {
        const merged = { ...prev, ...next }
        try {
          window.localStorage.setItem('bsky.cardMode', merged.mode)
          window.localStorage.setItem('bsky.cardSingleMax', String(merged.singleMax))
          window.localStorage.setItem('bsky.cardMultiMax', String(merged.multiMax))
        } catch { /* ignore */ }
        return merged
      })
    }
  }), [config])

  return (
    <CardConfigContext.Provider value={value}>
      {children}
    </CardConfigContext.Provider>
  )
}

export function useCardConfig () {
  return useContext(CardConfigContext)
}

