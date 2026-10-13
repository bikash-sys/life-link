import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

describe('LifeLink Frontend Application', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'ok',
              service: 'LifeLink API',
              timestamp: '2026-10-13T00:00:00.000Z',
            }),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders LifeLink brand title and subtitle', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('LifeLink')).toBeInTheDocument();
    expect(
      screen.getByText(/Community Blood and Essential Medicine Availability Network/i),
    ).toBeInTheDocument();
  });

  it('displays the medical safety notice', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText(/Medical Safety Notice:/i)).toBeInTheDocument();
  });
});
