import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

// Sicherstellen, dass React auch für JSX in nicht-standardisierten Modulen verfügbar ist
// (z.B. BskyClientLayout ohne Default-Import).
// Dies beeinflusst nur die Testumgebung.
// eslint-disable-next-line no-undef
globalThis.React = React

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
import BskyClientLayout from '../../src/modules/layout/BskyClientLayout.jsx'

/**
 * Testgruppe: BskyClientLayout.notificationsBadge.test.jsx
 *
 * Diese Tests überprüfen:
 * - Konsistente Anzeige des Notifications-Badge zwischen SidebarNav (Desktop) und MobileNavBar
 *
 * Kontext:
 * Regressionstest für tests/notification-badge-regression.md – Abschnitt 6:
 * „Wechsel zwischen SidebarNav ↔ MobileNavBar“.
 */

const matchMediaMock = vi.fn()

beforeEach(() => {
  // Standard: Desktop-Ansicht (isMobile = false)
  matchMediaMock.mockImplementation(query => ({
    matches: query === '(max-width: 768px)' ? false : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock
  })
})

const renderLayout = (props = {}) =>
  render(
    <ThemeProvider>
      <I18nProvider initialLocale='de'>
        <BskyClientLayout
          activeSection='home'
          notificationsUnread={0}
          onSelectSection={() => {}}
          onOpenCompose={() => {}}
          {...props}
        >
          <div>Content</div>
        </BskyClientLayout>
      </I18nProvider>
    </ThemeProvider>
  )

describe('BskyClientLayout – Notifications Badge', () => {
  it('zeigt denselben Badge-Zähler in SidebarNav und MobileNavBar, wenn notificationsUnread > 0 ist', () => {
    // Erste Renderphase: Desktop → SidebarNav ist sichtbar
    const { rerender } = renderLayout({ notificationsUnread: 7 })

    const sidebarButton = screen.getByRole('button', {
      name: /Mitteilungen \(7 neu\)/i
    })
    expect(sidebarButton).toBeInTheDocument()
    expect(sidebarButton.querySelector('span.bg-primary')).not.toBeNull()

    // Zweite Renderphase: Mobile-Ansicht simulieren
    matchMediaMock.mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? true : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))

    rerender(
      <ThemeProvider>
        <I18nProvider initialLocale='de'>
          <BskyClientLayout
            activeSection='home'
            notificationsUnread={7}
            onSelectSection={() => {}}
            onOpenCompose={() => {}}
          >
            <div>Content</div>
          </BskyClientLayout>
        </I18nProvider>
      </ThemeProvider>
    )

    const mobileNotifications = screen.getByRole('button', {
      name: /Mitteilungen \(7 neu\)/i
    })
    expect(mobileNotifications).toBeInTheDocument()
  })

  it('blendet den Badge in beiden Layouts aus, wenn notificationsUnread = 0 ist', () => {
    const { rerender } = renderLayout({ notificationsUnread: 0 })

    const sidebarButton = screen.getByRole('button', {
      name: /Mitteilungen$/i
    })
    expect(sidebarButton).toBeInTheDocument()
    const sidebarBadge = sidebarButton.querySelector('span.bg-primary')
    expect(sidebarBadge).not.toBeNull()
    expect(sidebarBadge).toHaveAttribute('aria-hidden', 'true')

    matchMediaMock.mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? true : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))

    rerender(
      <ThemeProvider>
        <I18nProvider initialLocale='de'>
          <BskyClientLayout
            activeSection='home'
            notificationsUnread={0}
            onSelectSection={() => {}}
            onOpenCompose={() => {}}
          >
            <div>Content</div>
          </BskyClientLayout>
        </I18nProvider>
      </ThemeProvider>
    )

    const mobileNotifications = screen.getByRole('button', {
      name: /Mitteilungen$/i
    })
    expect(mobileNotifications).toBeInTheDocument()
  })
})
