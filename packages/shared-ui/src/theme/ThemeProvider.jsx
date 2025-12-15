import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState
} from 'react'
import { DEFAULT_THEME, THEME_CONFIG, THEMES } from './config.js'

const ThemeContext = createContext(null)

export function ThemeProvider ({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME

    try {
      const stored = window.localStorage.getItem('theme')
      if (stored && THEMES.includes(stored)) return stored

      const prefersDark =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches

      if (prefersDark && THEMES.includes('dark')) {
        return 'dark'
      }

      return DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  // useEffect(() => {
  //   if (typeof document === 'undefined') return

  //   const activeTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME
  //   const config = THEME_CONFIG[activeTheme] || THEME_CONFIG[DEFAULT_THEME]
  //   const colorScheme = config.colorScheme === 'dark' ? 'dark' : 'light'

  //   const root = document.documentElement
  //   root.dataset.theme = activeTheme
  //   root.classList.toggle('dark', colorScheme === 'dark')
  //   root.style.colorScheme = colorScheme

  //   if (typeof window !== 'undefined') {
  //     try {
  //       window.localStorage.setItem('theme', activeTheme)
  //     } catch {
  //       // ignore write errors
  //     }
  //   }
  // }, [theme])

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    // Set DOM theme synchronously to avoid a visual flash (paint) between
    // the React state update and the CSS variables / .dark class taking effect.
    const activeTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME
    const cfg = THEME_CONFIG[activeTheme] || THEME_CONFIG[DEFAULT_THEME]
    const colorScheme = cfg.colorScheme === 'dark' ? 'dark' : 'light'

    const root = document.documentElement
    root.dataset.theme = activeTheme
    root.classList.toggle('dark', colorScheme === 'dark')
    root.style.colorScheme = colorScheme

    try {
      window.localStorage.setItem('theme', activeTheme)
    } catch {
      // ignore write errors
    }
  }, [theme])
  
  const value = useMemo(
    () => ({
      theme: THEMES.includes(theme) ? theme : DEFAULT_THEME,
      setTheme: setThemeState,
      themes: THEMES,
      themeConfig: THEME_CONFIG
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme () {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
