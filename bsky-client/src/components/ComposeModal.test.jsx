import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ComposeModal from './ComposeModal.jsx';

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

  it('invokes onClose when clicking overlay or close button', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ComposeModal open onClose={onClose}>Body</ComposeModal>,
    );

    const overlay = container.querySelector("[data-role='overlay']");
    expect(overlay).not.toBeNull();

    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeButton = screen.getByRole('button', { name: /schlie/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
