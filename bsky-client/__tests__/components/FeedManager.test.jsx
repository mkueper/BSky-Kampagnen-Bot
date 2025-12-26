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
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'
import FeedManager from '../../src/modules/layout/FeedManager.jsx'

const baseFeeds = {
  pinned: [
    {
      id: 'feed-1',
      displayName: 'Pinned Feed',
      creator: { handle: 'pinned.test' },
      feedUri: 'at://feed/pinned',
      pinned: true
    }
  ],
  saved: [
    {
      id: 'feed-2',
      displayName: 'Saved Feed',
      creator: { handle: 'saved.test' },
      feedUri: 'at://feed/saved',
      pinned: false
    }
  ],
  errors: [],
  action: {}
}

const renderFeedManager = (overrides = {}) =>
  render(
    <ThemeProvider>
      <I18nProvider initialLocale='de'>
        <FeedManager
          variant='page'
          open
          loading={false}
          error=''
          feeds={baseFeeds}
          onClose={() => {}}
          onRefresh={() => {}}
          onPin={() => {}}
          onUnpin={() => {}}
          onReorder={() => {}}
          {...overrides}
        />
      </I18nProvider>
    </ThemeProvider>
  )

describe('FeedManager', () => {
  it('rendert gepinnte und gespeicherte Feeds', () => {
    renderFeedManager()

    expect(screen.getByText('Pinned Feed')).toBeInTheDocument()
    expect(screen.getByText('Saved Feed')).toBeInTheDocument()
    expect(screen.getByText('von @pinned.test')).toBeInTheDocument()
    expect(screen.getByText('von @saved.test')).toBeInTheDocument()
  })

  it('zeigt Empty-States fuer leere Listen', () => {
    renderFeedManager({
      feeds: { pinned: [], saved: [], errors: [], action: {} }
    })

    expect(screen.getByText('Noch keine Feeds angepinnt.')).toBeInTheDocument()
    expect(screen.getByText('Keine weiteren gespeicherten Feeds vorhanden.')).toBeInTheDocument()
  })

  it('zeigt Fehler-Panel fuer einzelne Feeds', () => {
    renderFeedManager({
      feeds: {
        ...baseFeeds,
        errors: [{ feedUri: 'at://feed/error', message: 'Feed konnte nicht geladen werden.' }]
      }
    })

    expect(screen.getByText('Feed konnte nicht geladen werden.')).toBeInTheDocument()
  })
})
