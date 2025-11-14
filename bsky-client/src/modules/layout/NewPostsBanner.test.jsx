import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NewPostsBanner from './NewPostsBanner.jsx'

describe('NewPostsBanner', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<NewPostsBanner visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders button when visible', () => {
    render(<NewPostsBanner visible={true} />)
    expect(screen.getByRole('button', { name: /Neue Beitraege anzeigen/i })).toBeInTheDocument()
  })

  it('hides banner when busy', () => {
    const { container } = render(<NewPostsBanner visible={true} busy />)
    expect(container.firstChild).toBeNull()
  })

  it('invokes onClick when pressed', () => {
    const handler = vi.fn()
    render(<NewPostsBanner visible={true} onClick={handler} />)
    fireEvent.click(screen.getByRole('button', { name: /Neue Beitraege anzeigen/i }))
    expect(handler).toHaveBeenCalled()
  })
})
