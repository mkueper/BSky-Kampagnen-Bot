import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import MainOverviewView from '../../components/views/MainOverviewView.jsx'

vi.mock('../../i18n/I18nProvider.jsx', () => ({
  useTranslation: () => ({
    t: (key, defaultValue, vars = {}) => {
      if (defaultValue) {
        return defaultValue.replace(/\{(\w+)\}/g, (_, token) =>
          vars[token] != null ? String(vars[token]) : `{${token}}`
        )
      }
      return key
    }
  })
}))

vi.mock('../../components/ui/ThemeContext.jsx', () => ({
  useTheme: () => ({ panelBg: 'bg-background' })
}))

vi.mock('@bsky-kampagnen-bot/shared-ui', () => ({
  Card: ({ children, padding = '' }) => (
    <div data-testid='card' data-padding={padding}>
      {children}
    </div>
  ),
  InfoDialog: ({ open, title, content }) =>
    open ? (
      <div data-testid='info-dialog'>
        <strong>{title}</strong>
        <div>{content}</div>
      </div>
    ) : null
}))

vi.mock('../../components/ui/NextScheduledCard.jsx', () => ({
  default: ({ title }) => <div data-testid='next-card'>{title}</div>
}))

describe('MainOverviewView', () => {
  const baseProps = {
    threads: [
      {
        id: 'thr-1',
        status: 'scheduled',
        scheduledAt: '2025-01-02T10:00:00Z',
        title: 'Thread One'
      },
      {
        id: 'thr-2',
        status: 'draft',
        scheduledAt: '2025-01-03T12:00:00Z',
        title: 'Thread Draft'
      },
      {
        id: 'thr-3',
        status: 'published',
        scheduledAt: '2025-01-01T08:00:00Z',
        title: 'Thread Published'
      }
    ],
    plannedSkeets: [
      { id: 'sk-1', scheduledAt: '2025-02-01T08:00:00Z', content: 'First planned' },
      { id: 'sk-2', scheduledAt: '2025-02-02T09:00:00Z', content: 'Second planned' }
    ],
    publishedSkeets: [{ id: 'sk-3', likesCount: 4, repostsCount: 1 }],
    pendingCount: 3,
    onOpenSkeetsOverview: vi.fn(),
    onOpenPendingSkeets: vi.fn(),
    onOpenThreadsOverview: vi.fn()
  }

  it('rendert den Statistik-Header, Zusammenfassungskacheln und Info-Dialog', () => {
    render(<MainOverviewView {...baseProps} />)

    expect(screen.getByText('Post- und Thread-Statistik')).toBeInTheDocument()
    const infoButton = screen.getByText('Info')
    expect(infoButton).toBeInTheDocument()

    fireEvent.click(infoButton)
    expect(
      screen.getByText(/Die oberen drei Kennzahlen zeigen geplante/i)
    ).toBeInTheDocument()

    const plannedPostsBox = screen.getByText('Geplante Posts').closest('div')
    expect(plannedPostsBox).not.toBeNull()
    expect(within(plannedPostsBox).getByText('2')).toBeInTheDocument()

    const publishedPostsBox = screen.getByText('Veröffentlichte Posts').closest('div')
    expect(within(publishedPostsBox).getByText('1')).toBeInTheDocument()

    const pendingPostsBox = screen.getByText('Freizugebende Posts').closest('div')
    expect(within(pendingPostsBox).getByText('3')).toBeInTheDocument()

    const plannedThreadsBox = screen.getByText('Geplante Threads').closest('div')
    expect(within(plannedThreadsBox).getByText('2')).toBeInTheDocument()

    const publishedThreadsBox = screen.getByText('Veröffentlichte Threads').closest('div')
    expect(within(publishedThreadsBox).getByText('1')).toBeInTheDocument()

    expect(screen.getByText('Freizugebende Threads')).toBeInTheDocument()
    expect(screen.getAllByTestId('next-card')).toHaveLength(2)
  })
})
