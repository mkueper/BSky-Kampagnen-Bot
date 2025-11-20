import { createContext, useContext, useState, useRef, useCallback } from 'react'

const LayoutContext = createContext({
  headerHeight: 60, // Ein sinnvoller Standardwert als Fallback
  headerTop: 20,
  setHeaderRef: () => {}
})

export function useLayout () {
  return useContext(LayoutContext)
}

export function LayoutProvider ({ children }) {
  const [headerHeight, setHeaderHeight] = useState(60)
  const [headerTop, setHeaderTop] = useState(20)

  const headerRef = useRef(null)

  const setHeaderRef = useCallback((node) => {
    if (node) {
      headerRef.current = node
      const observer = new ResizeObserver(entries => {
        const entry = entries[0]
        if (entry) {
          const height = Math.ceil(entry.contentRect.height)
          setHeaderHeight(height)
          const top = Math.ceil(entry.contentRect.top)
          setHeaderTop(top)
        }
      })
      observer.observe(node)
      return () => observer.disconnect()
    }
  }, [])

  const value = { headerHeight, headerTop, setHeaderRef }

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}