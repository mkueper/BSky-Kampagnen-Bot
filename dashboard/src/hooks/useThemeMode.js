import { useEffect, useMemo, useState } from 'react'

export function useThemeMode ({
  themes,
  themeConfig,
  defaultTheme
}) {
  const themeList = useMemo(() => {
    if (Array.isArray(themes) && themes.length > 0) return themes
    return ['light']
  }, [themes])

  const resolvedDefault = useMemo(() => {
    if (themeList.includes(defaultTheme)) return defaultTheme || themeList[0]
    return themeList[0]
  }, [themeList, defaultTheme])

  const readStoredTheme = () => {
    if (typeof window === 'undefined') return resolvedDefault
    const stored = window.localStorage.getItem('theme')
    if (stored && themeList.includes(stored)) {
      return stored
    }
    const prefersDark = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
    return prefersDark ? 'dark' : resolvedDefault
  }

  const readExplicitFlag = () => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('theme')
    return Boolean(stored && themeList.includes(stored))
  }

  const [theme, setTheme] = useState(readStoredTheme)
  const [userHasExplicitTheme, setUserHasExplicitTheme] = useState(readExplicitFlag)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const resolvedTheme = themeList.includes(theme) ? theme : resolvedDefault
    const settings = themeConfig[resolvedTheme] || {}
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.theme = resolvedTheme
    root.style.colorScheme = settings.colorScheme ?? 'light'
    if (userHasExplicitTheme) {
      window.localStorage.setItem('theme', resolvedTheme)
    } else {
      window.localStorage.removeItem('theme')
    }
  }, [theme, themeList, themeConfig, resolvedDefault, userHasExplicitTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = event => {
      if (!userHasExplicitTheme) {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [userHasExplicitTheme])

  const currentTheme = themeList.includes(theme) ? theme : resolvedDefault
  const currentThemeConfig = themeConfig[currentTheme] || {}
  const nextTheme = themeList[(themeList.indexOf(currentTheme) + 1) % themeList.length]
  const nextThemeLabel = themeConfig[nextTheme]?.label ?? 'Theme wechseln'
  const ThemeIcon = currentThemeConfig.icon

  const handleToggleTheme = () => {
    setUserHasExplicitTheme(true)
    setTheme(current => {
      const curr = themeList.includes(current) ? current : resolvedDefault
      const index = themeList.indexOf(curr)
      const nextIndex = (index + 1) % themeList.length
      return themeList[nextIndex]
    })
  }

  return {
    theme: currentTheme,
    currentThemeConfig,
    nextTheme,
    nextThemeLabel,
    ThemeIcon,
    toggleTheme: handleToggleTheme,
    setTheme,
    setUserHasExplicitTheme
  }
}
