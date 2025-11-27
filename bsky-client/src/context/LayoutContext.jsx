import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

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
  const [headerElement, setHeaderElement] = useState(null)

  const headerRef = useRef(null)
  const observerRef = useRef(null)

  const setHeaderRef = useCallback((node) => {
    if (headerRef.current === node) return
    headerRef.current = node
    setHeaderElement(node)
  }, [])

  useEffect(() => {
    observerRef.current = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const height = Math.ceil(entry.contentRect.height)
      setHeaderHeight(height)
      const top = Math.ceil(entry.contentRect.top)
      setHeaderTop(top)
    })
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const observer = observerRef.current
    if (!observer || !headerElement) return undefined
    observer.observe(headerElement)
    return () => {
      observer.unobserve(headerElement)
    }
  }, [headerElement])

  const value = { headerHeight, headerTop, setHeaderRef }

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}
