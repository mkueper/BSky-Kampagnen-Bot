import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.jsx';

describe('Button', () => {
  it('renders the provided label', () => {
    render(<Button>Submit</Button>);

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('applies size, variant and custom classes', () => {
    render(
      <Button variant="secondary" size="pill" className="extra">Action</Button>,
    );

    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveClass('px-3', 'py-1', 'text-sm'); // pill size classes
    expect(button).toHaveClass('bg-background-subtle', 'text-foreground'); // secondary variant classes
    expect(button).toHaveClass('extra');
  });

  it('handles clicks when enabled and ignores them when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const { rerender } = render(<Button onClick={onClick}>Tap</Button>);

    await user.click(screen.getByRole('button', { name: 'Tap' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<Button onClick={onClick} disabled>Tap</Button>);

    expect(screen.getByRole('button', { name: 'Tap' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Tap' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
