import { createContext, useContext, useMemo } from 'react'

const defaultTheme = {
  // Main surface backgrounds
  panelBg: 'bg-background',
  // Card background + default hover behavior
  cardBg: 'bg-background',
  cardHover: false
}

const ThemeContext = createContext(defaultTheme)

export function ThemeProvider ({ value, children }) {
  const merged = useMemo(() => ({ ...defaultTheme, ...(value || {}) }), [value])
  return <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>
}

export function useTheme () {
  return useContext(ThemeContext)
}

export { defaultTheme }

