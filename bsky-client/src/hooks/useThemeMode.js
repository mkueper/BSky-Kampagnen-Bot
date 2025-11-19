import { useEffect, useMemo, useState, useCallback } from 'react'
export function useThemeMode({
  themes,
  themeConfig,
  defaultTheme
}) {
  const themeList = useMemo(() => (Array.isArray(themes) && themes.length > 0 ? themes : ['light']), [themes])

  const resolvedDefault = useMemo(() => {
    if (themeList.includes(defaultTheme)) return defaultTheme || themeList[0]
    return themeList[0]
  }, [themeList, defaultTheme])

  const [theme, setTheme] = useState(() => {
    
    if (typeof window === 'undefined') return resolvedDefault

    // eslint-disable-next-line no-undef
    const stored = window.localStorage.getItem('theme')
    if (stored && themeList.includes(stored)) return stored

    // eslint-disable-next-line no-undef
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
    //const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    // Fallback auf 'dark' nur, wenn es auch existiert
    if (prefersDark && themeList.includes('dark')) return 'dark'

    return resolvedDefault
  })

  const [userHasExplicitTheme, setUserHasExplicitTheme] = useState(() => {
    
    if (typeof window === 'undefined') return false
    // eslint-disable-next-line no-undef
    const stored = window.localStorage.getItem('theme')
    return Boolean(stored && themeList.includes(stored))
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    // eslint-disable-next-line no-undef
    const root = document.documentElement
    const resolvedTheme = themeList.includes(theme) ? theme : resolvedDefault
    const settings = themeConfig[resolvedTheme] || {}

    // Klassen für alle Themes entfernen und nur die aktuelle setzen
    themeList.forEach(t => root.classList.remove(t))
    root.classList.add(resolvedTheme)
    root.classList.toggle('dark', settings.isDark ?? (resolvedTheme !== 'light'))

    root.dataset.theme = resolvedTheme
    root.style.colorScheme = settings.colorScheme ?? 'light'
    if (userHasExplicitTheme) {
      // eslint-disable-next-line no-undef
      window.localStorage.setItem('theme', resolvedTheme)
    } else {
      // eslint-disable-next-line no-undef
      window.localStorage.removeItem('theme')
    }
  }, [theme, themeList, themeConfig, resolvedDefault, userHasExplicitTheme])

  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (typeof window?.matchMedia !== 'function') return undefined
    // eslint-disable-next-line no-undef
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = event => {
      if (!userHasExplicitTheme) {
        setTheme(event.matches && themeList.includes('dark') ? 'dark' : resolvedDefault)
      }
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [userHasExplicitTheme, resolvedDefault, themeList])

  const currentTheme = themeList.includes(theme) ? theme : resolvedDefault
  const currentThemeConfig = themeConfig[currentTheme] || {}
  const nextTheme = themeList[(themeList.indexOf(currentTheme) + 1) % themeList.length]
  const nextThemeConfig = themeConfig[nextTheme] || {}
  const nextThemeLabel = nextThemeConfig?.label ?? 'Theme wechseln'
  const ThemeIcon = currentThemeConfig.icon

  const toggleTheme = useCallback(() => {
    setUserHasExplicitTheme(true)
    const currentIndex = themeList.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themeList.length
    setTheme(themeList[nextIndex])
  }, [currentTheme, themeList])

  return {
    theme: currentTheme,
    currentThemeConfig,
    nextTheme,
    nextThemeConfig,
    nextThemeLabel,
    ThemeIcon,
    toggleTheme,
    setTheme,
    setUserHasExplicitTheme
  }
}
