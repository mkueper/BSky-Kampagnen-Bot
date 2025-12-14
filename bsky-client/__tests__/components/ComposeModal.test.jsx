/**
 * Testgruppe: ComposeModal.test.jsx
 *
 * Diese Tests überprüfen:
 * - Rendering des Modals in offen/geschlossen Zustand
 * - Darstellung von Titel, Actions und Body
 * - Modale lassen sich nur über explizite Aktionen schließen (kein Overlay/X)
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur des bsky-client.
 * Stellt sicher, dass Komponenten, Hooks, Contexts und Flows stabil funktionieren.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ComposeModal from '../../src/modules/composer/ComposeModal.jsx'

describe('ComposeModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ComposeModal open={false} onClose={() => {}}>content</ComposeModal>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows title, actions and children when open', () => {
    render(
      <ComposeModal
        open
        title="Custom"
        actions={<span>extra</span>}
      >
        <p>Body</p>
      </ComposeModal>,
    );

    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('extra')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('does not close when clicking the overlay', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <ComposeModal
        open
        actions={
          <button type='button' onClick={onClose}>Cancel</button>
        }
      >
        Body
      </ComposeModal>
    )

    const overlay = container.querySelector("[data-role='overlay']")
    expect(overlay).not.toBeNull()

    await user.click(overlay)
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
