import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Timeline from './Timeline.jsx';

const originalFetch = global.fetch;

describe('Timeline', () => {
  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
    vi.restoreAllMocks();
  });

  it('shows empty state when feed is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ feed: [], cursor: null }),
    });
    global.fetch = fetchMock;

    render(<Timeline tab="home" />);

    expect(screen.getByLabelText(/Lade Timeline/i)).toBeInTheDocument();

    expect(await screen.findByText(/Keine Eintr/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders an error message when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'kaputt' }),
    });
    global.fetch = fetchMock;

    render(<Timeline tab="discover" />);

    expect(await screen.findByText(/Fehler: kaputt/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
