import { useEffect } from 'react'
import { useThemeMode } from './useThemeMode'

export function useThemeDebug(name) {
  const { theme, currentThemeConfig } = useThemeMode()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const domTheme = document.documentElement.dataset.theme
    const isDark = document.documentElement.classList.contains('dark')

    // bewusst „laut“, damit es auffällt
    console.log('[theme-debug]', name, {
      themeState: theme,
      domTheme,
      isDark,
      colorScheme: currentThemeConfig?.colorScheme,
      ts: performance.now()
    })
  })
}
