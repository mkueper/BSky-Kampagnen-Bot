import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollTopButton from './ScrollTopButton.jsx';

function createScrollContainer() {
  const container = document.createElement('div');
  container.id = 'bsky-scroll-container';
  Object.defineProperties(container, {
    scrollTop: { value: 0, writable: true },
    clientHeight: { value: 600, writable: true },
    scrollHeight: { value: 2000, writable: true },
  });
  container.scrollTo = vi.fn();
  document.body.appendChild(container);
  return container;
}

describe('ScrollTopButton', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('becomes visible once the container scroll exceeds the threshold', async () => {
    const container = createScrollContainer();

    render(<ScrollTopButton threshold={100} ariaLabel="Top" />);

    expect(screen.queryByRole('button', { name: 'Top' })).toBeNull();

    container.scrollTop = 150;
    fireEvent.scroll(container);

    await screen.findByRole('button', { name: 'Top' });

    await userEvent.click(screen.getByRole('button', { name: 'Top' }));
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('falls back to window scrolling when no container element exists', async () => {
    const scrollToSpy = vi.fn();
    vi.spyOn(window, 'scrollTo').mockImplementation(scrollToSpy);
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

    render(<ScrollTopButton threshold={50} ariaLabel="Up" />);

    expect(screen.queryByRole('button', { name: 'Up' })).toBeNull();

    window.scrollY = 120;
    fireEvent.scroll(window);

    await screen.findByRole('button', { name: 'Up' });

    await userEvent.click(screen.getByRole('button', { name: 'Up' }));
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
