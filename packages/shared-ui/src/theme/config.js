import { MoonIcon, ShadowIcon, SunIcon } from '@radix-ui/react-icons'

export const THEMES = ['light', 'dim', 'dark', 'midnight']

export const THEME_CONFIG = {
  light: {
    label: 'Hell',
    colorScheme: 'light',
    icon: SunIcon,
    previewColor: '#e2e8f0'
  },
  dark: {
    label: 'Dunkel',
    colorScheme: 'dark',
    icon: MoonIcon,
    previewColor: '#0f172a'
  },
  dim: {
    label: 'Gedimmt',
    colorScheme: 'dark',
    icon: ShadowIcon,
    previewColor: '#94a3b8'
  },
  midnight: {
    label: 'Mitternacht',
    colorScheme: 'dark',
    icon: ShadowIcon,
    previewColor: '#020617'
  }
}

export const DEFAULT_THEME = THEMES[0]

