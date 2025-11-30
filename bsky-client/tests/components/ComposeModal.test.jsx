/**
 * Testgruppe: ComposeModal.test.jsx
 *
 * Diese Tests überprüfen:
 * - Rendering des Modals in offen/geschlossen Zustand
 * - Darstellung von Titel, Actions und Body
 * - Schließen via Overlay/Close-Button
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur des bsky-client.
 * Stellt sicher, dass Komponenten, Hooks, Contexts und Flows stabil funktionieren.
 */
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
        onClose={() => {}}
      >
        <p>Body</p>
      </ComposeModal>,
    );

    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('extra')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('invokes onClose when clicking overlay or close button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <ComposeModal open onClose={onClose}>Body</ComposeModal>
    )

    const overlay = container.querySelector("[data-role='overlay']")
    expect(overlay).not.toBeNull()

    await user.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)

    const closeButton = screen.getByRole('button', { name: /schlie/i })
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
