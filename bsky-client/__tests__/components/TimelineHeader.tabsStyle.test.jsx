import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'
import { TimelineHeader } from '../../src/modules/layout/HeaderContent.jsx'

const renderWithProviders = (ui, options) => render(ui, {
  wrapper: ({ children }) => (
    <I18nProvider initialLocale='de'>{children}</I18nProvider>
  ),
  ...options
})

describe('TimelineHeader tab styles', () => {
  it('applies sidebar-like hover classes to inactive tabs and secondary style to active tab', () => {
    const tabs = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', hasNew: true }
    ]
    renderWithProviders(<TimelineHeader tabs={tabs} timelineTab='a' onSelectTab={() => {}} />)

    const active = document.querySelector('[data-tab="a"]')
    const inactive = document.querySelector('[data-tab="b"]')

    expect(active).toBeInTheDocument()
    expect(inactive).toBeInTheDocument()

    // active should have border + background-subtle (secondary look)
    expect(active.className).toMatch(/border/) 
    expect(active.className).toMatch(/bg-background-subtle/)

    // inactive should include stronger hover classes
    expect(inactive.className).toMatch(/hover:bg-background-subtle\/80/)
    expect(inactive.className).toMatch(/dark:hover:bg-primary\/10/)
    expect(inactive.className).toMatch(/hover:shadow-lg/)
    expect(inactive.className).toMatch(/hover:scale-\[1.02\]/)
  })
})
