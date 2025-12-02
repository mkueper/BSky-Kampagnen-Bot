import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from '../../src/components/Card.jsx'

describe('Card (shared-ui)', () => {
  it('renders with default background and padding', () => {
    render(<Card>Content</Card>)

    const article = screen.getByText('Content')
    expect(article).toHaveClass('rounded-2xl', 'bg-background', 'p-5')
  })

  it('supports custom background variants and hover state', () => {
    render(<Card background='subtle' hover>Body</Card>)

    const article = screen.getByText('Body')
    expect(article).toHaveClass('bg-background-subtle')
    expect(article).toHaveClass('hover:-translate-y-0.5')
  })

  it('allows overriding the wrapper element', () => {
    render(<Card as='section' padding='p-8'>Section</Card>)

    const section = screen.getByText('Section')
    expect(section.tagName).toBe('SECTION')
    expect(section).toHaveClass('p-8')
  })
})
