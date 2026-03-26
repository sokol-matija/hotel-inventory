import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NtfyMessage } from './types';
import { useNtfySubscription } from './useNtfySubscription';

vi.mock('./ntfyClient', () => ({
  ntfySubscribeSSE: vi.fn(),
  STAFF_TOPIC: 'hotel-porec-staff',
}));

import { STAFF_TOPIC, ntfySubscribeSSE } from './ntfyClient';

// ── Setup ─────────────────────────────────────────────────────────────────────

const mockCleanup = vi.fn();

beforeEach(() => {
  mockCleanup.mockClear();
  vi.mocked(ntfySubscribeSSE).mockReturnValue(mockCleanup);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNtfySubscription', () => {
  it('opens an SSE connection to STAFF_TOPIC with the provided callback', () => {
    const onMessage = vi.fn();
    renderHook(() => useNtfySubscription(onMessage));

    expect(ntfySubscribeSSE).toHaveBeenCalledOnce();
    expect(ntfySubscribeSSE).toHaveBeenCalledWith(STAFF_TOPIC, onMessage);
  });

  it('calls the cleanup function returned by ntfySubscribeSSE on unmount', () => {
    const { unmount } = renderHook(() => useNtfySubscription(vi.fn()));

    unmount();

    expect(mockCleanup).toHaveBeenCalledOnce();
  });

  it('resubscribes when onMessage reference changes', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: (msg: NtfyMessage) => void }) => useNtfySubscription(cb),
      { initialProps: { cb: cb1 } }
    );

    // Don't assert exact count — StrictMode may double-invoke effects
    expect(ntfySubscribeSSE).toHaveBeenLastCalledWith(STAFF_TOPIC, cb1);

    // Reset counters so we only count calls triggered by the rerender
    vi.clearAllMocks();
    vi.mocked(ntfySubscribeSSE).mockReturnValue(mockCleanup);

    rerender({ cb: cb2 });

    expect(ntfySubscribeSSE).toHaveBeenCalledOnce();
    expect(ntfySubscribeSSE).toHaveBeenLastCalledWith(STAFF_TOPIC, cb2);
  });

  it('does not resubscribe when onMessage reference is stable', () => {
    const stableCb = vi.fn();

    const { rerender } = renderHook(() => useNtfySubscription(stableCb));

    // Reset counters after initial mount (StrictMode may have fired multiple times)
    vi.clearAllMocks();
    vi.mocked(ntfySubscribeSSE).mockReturnValue(mockCleanup);

    rerender();
    rerender();

    // No new subscriptions — callback reference is stable
    expect(ntfySubscribeSSE).not.toHaveBeenCalled();
  });
});
