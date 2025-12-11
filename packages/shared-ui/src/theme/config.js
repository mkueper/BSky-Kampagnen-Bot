import { MoonIcon, ShadowIcon, SunIcon } from '@radix-ui/react-icons'

export const THEMES = ['light', 'dim', 'dark', 'midnight']

export const THEME_CONFIG = {
  light: {
    labelKey: 'theme.mode.light',
    label: 'Hell',
    colorScheme: 'light',
    icon: SunIcon,
    previewColor: '#e2e8f0'
  },
  dark: {
    labelKey: 'theme.mode.dark',
    label: 'Dunkel',
    colorScheme: 'dark',
    icon: MoonIcon,
    previewColor: '#0f172a'
  },
  dim: {
    labelKey: 'theme.mode.dim',
    label: 'Gedimmt',
    colorScheme: 'dark',
    icon: ShadowIcon,
    previewColor: '#94a3b8'
  },
  midnight: {
    labelKey: 'theme.mode.midnight',
    label: 'Mitternacht',
    colorScheme: 'dark',
    icon: ShadowIcon,
    previewColor: '#020617'
  }
}

export const DEFAULT_THEME = THEMES[0]
