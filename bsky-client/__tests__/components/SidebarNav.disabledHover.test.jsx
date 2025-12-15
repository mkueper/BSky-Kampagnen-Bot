import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../../packages/shared-ui/src/theme/ThemeProvider.jsx', () => {
  const React = require('react')
  const ThemeContext = React.createContext({
    theme: 'light',
    setTheme: () => {},
    themes: ['light'],
    themeConfig: {}
  })
  const ThemeProvider = ({ children }) =>
    React.createElement(
      ThemeContext.Provider,
      {
        value: {
          theme: 'light',
          setTheme: () => {},
          themes: ['light'],
          themeConfig: {}
        }
      },
      children
    )
  const useTheme = () => React.useContext(ThemeContext)
  return { ThemeProvider, useTheme }
})

import { ThemeProvider } from '../../../packages/shared-ui/src/theme/ThemeProvider.jsx'
import SidebarNav from '../../src/modules/layout/SidebarNav.jsx'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

const renderWithProviders = (props = {}) =>
  render(
    <ThemeProvider>
      <I18nProvider initialLocale='de'>
        <SidebarNav active='home' onSelect={() => {}} {...props} />
      </I18nProvider>
    </ThemeProvider>
  )

describe('SidebarNav – disabled hover behavior', () => {
  it('zeigt bei deaktivierten Nav-Buttons keine Hover-Interaktion (CSS-Override vorhanden)', () => {
    renderWithProviders()

    const chatButton = document.querySelector('[data-nav-item="chat"]')
    expect(chatButton).toBeInTheDocument()
    expect(chatButton).toBeDisabled()
    // Prüfe, dass die disabled-Variante vorhanden ist und Hover-Effekte unterdrücken kann
    expect(chatButton.className).toMatch(/disabled:pointer-events-none/)
    expect(chatButton.className).toMatch(/cursor-not-allowed/)
  })

  it('hat einen auffälligen Hover-Stil für aktive/inaktive Buttons', () => {
    renderWithProviders({ active: 'home' })
    const searchButton = document.querySelector('[data-nav-item="search"]')
    expect(searchButton).toBeInTheDocument()
    // inaktiver Button sollte die Hover-Klassen für stärkere Sichtbarkeit besitzen
    expect(searchButton.className).toMatch(/hover:bg-background-subtle\/80/)
    expect(searchButton.className).toMatch(/dark:hover:bg-primary\/10/)
    expect(searchButton.className).toMatch(/hover:shadow-lg/)
    expect(searchButton.className).toMatch(/hover:scale-\[1.02\]/)
  })

  it('zeigt den aktiven Button in sekundärem Stil (border + bg)', () => {
    renderWithProviders({ active: 'home' })
    const homeButton = document.querySelector('[data-nav-item="home"]')
    expect(homeButton).toBeInTheDocument()
    expect(homeButton.className).toMatch(/border/) // border added for secondary style
    expect(homeButton.className).toMatch(/bg-background-subtle/) // background-subtle for secondary look
  })
})
