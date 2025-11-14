import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuickComposer from './QuickComposer.jsx'

vi.mock('../../hooks/useComposer', () => ({
  useComposer: () => ({
    openComposer: vi.fn()
  })
}))

describe('QuickComposer', () => {
  it('disables send button when empty', () => {
    render(<QuickComposer />)
    expect(screen.getByRole('button', { name: /Posten/i })).toBeDisabled()
  })
})
