import { useCallback, useMemo } from 'react'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { DEFAULT_THEME } from '../theme/config.js'

export function useThemeMode () {
  const { theme, setTheme, themes, themeConfig } = useTheme()

  const themeList = useMemo(
    () => (Array.isArray(themes) && themes.length > 0 ? themes : ['light']),
    [themes]
  )

  const currentTheme = themeList.includes(theme) ? theme : themeList[0]
  const currentThemeConfig = themeConfig[currentTheme] || {}
  const nextTheme =
    themeList[(themeList.indexOf(currentTheme) + 1) % themeList.length]
  const nextThemeConfig = themeConfig[nextTheme] || {}
  const nextThemeLabel = nextThemeConfig?.label ?? 'Theme wechseln'
  const ThemeIcon = currentThemeConfig.icon

  const toggleTheme = useCallback(() => {
    const currentIndex = themeList.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themeList.length
    const nextTheme = themeList[nextIndex]

    // console.log('BEFORE DOM UPDATE:', {
    //   stateTheme: theme,
    //   domTheme: typeof document !== 'undefined' ? document.documentElement.dataset.theme : 'n/a'
    // })

    const cfg = themeConfig[nextTheme] || themeConfig[DEFAULT_THEME]
    const colorScheme = cfg.colorScheme === 'dark' ? 'dark' : 'light'

    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.dataset.theme = nextTheme
      root.classList.toggle('dark', colorScheme === 'dark')
      root.style.colorScheme = colorScheme
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('theme', nextTheme)
      } catch {
        /* ignore storage errors */
      }
    }

    // console.log('AFTER DOM UPDATE, BEFORE setTheme:', {
    //   nextTheme,
    //   domTheme: typeof document !== 'undefined' ? document.documentElement.dataset.theme : 'n/a'
    // })

    setTheme(nextTheme)
  }, [theme, themeList, themeConfig])

  return {
    theme: currentTheme,
    currentThemeConfig,
    nextTheme,
    nextThemeConfig,
    nextThemeLabel,
    ThemeIcon,
    toggleTheme
  }
}
