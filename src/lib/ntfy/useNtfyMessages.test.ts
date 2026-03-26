import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWrapper } from '@/test/utils';
import type { NtfyMessage } from './types';
import { useNtfyMessages } from './useNtfyMessages';

vi.mock('./ntfyClient', () => ({
  ntfyPollHistory: vi.fn(),
  STAFF_TOPIC: 'hotel-porec-staff',
}));

import { ntfyPollHistory } from './ntfyClient';

// ── localStorage stub ─────────────────────────────────────────────────────────

let lsStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => lsStore[key] ?? null,
  setItem: (key: string, value: string) => {
    lsStore[key] = value;
  },
  removeItem: (key: string) => {
    delete lsStore[key];
  },
  clear: () => {
    lsStore = {};
  },
};
vi.stubGlobal('localStorage', localStorageMock);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal NtfyMessage at a given Unix time (seconds) */
function makeMsg(timeSec: number, id = String(timeSec)): NtfyMessage {
  return { id, time: timeSec, event: 'message', topic: 'hotel-porec-staff', message: `msg-${id}` };
}

// Use second-level math throughout to match msg.time precision
const nowSec = Math.floor(Date.now() / 1000);

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  lsStore = {};
  vi.mocked(ntfyPollHistory).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNtfyMessages', () => {
  it('returns messages fetched via ntfyPollHistory', async () => {
    const msgs = [makeMsg(nowSec - 1, 'a'), makeMsg(nowSec - 2, 'b')];
    vi.mocked(ntfyPollHistory).mockResolvedValue(msgs);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.messages).toEqual(msgs);
  });

  it('starts with isLoading true then false after fetch', async () => {
    vi.mocked(ntfyPollHistory).mockResolvedValue([]);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    // Eventually resolves
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('counts messages newer than lastReadAt as unread', async () => {
    // lastReadAt = 5 seconds ago (in ms)
    const lastReadAt = (nowSec - 5) * 1000;
    localStorage.setItem('ntfy_last_read', String(lastReadAt));

    const msgs = [
      makeMsg(nowSec - 2, 'new1'), // newer than lastReadAt → unread
      makeMsg(nowSec - 1, 'new2'), // newer → unread
      makeMsg(nowSec - 10, 'old'), // older → read
    ];
    vi.mocked(ntfyPollHistory).mockResolvedValue(msgs);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(2);
  });

  it('treats all messages as unread when localStorage has no entry', async () => {
    const msgs = [makeMsg(nowSec - 1), makeMsg(nowSec - 2)];
    vi.mocked(ntfyPollHistory).mockResolvedValue(msgs);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(2);
  });

  it('markAllRead sets unreadCount to 0 and persists timestamp to localStorage', async () => {
    const msgs = [makeMsg(nowSec - 1, 'recent')];
    vi.mocked(ntfyPollHistory).mockResolvedValue(msgs);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.unreadCount).toBeGreaterThan(0));

    await act(async () => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    const stored = localStorage.getItem('ntfy_last_read');
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(0);
  });

  it('appendMessage prepends to the cached message list', async () => {
    vi.mocked(ntfyPollHistory).mockResolvedValue([makeMsg(nowSec - 5, 'existing')]);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const incoming = makeMsg(nowSec, 'fresh');
    act(() => {
      result.current.appendMessage(incoming);
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].id).toBe('fresh'); // prepended
    });
  });

  it('appendMessage increments unreadCount for new messages', async () => {
    // Mark everything as read first
    localStorage.setItem('ntfy_last_read', String(Date.now()));
    vi.mocked(ntfyPollHistory).mockResolvedValue([]);

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(0);

    // A message arrives after we marked all read
    const futureMsg = makeMsg(Math.floor(Date.now() / 1000) + 1, 'new');
    act(() => {
      result.current.appendMessage(futureMsg);
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(1));
  });

  it('returns empty messages array before data loads', () => {
    // ntfyPollHistory never resolves in this test
    vi.mocked(ntfyPollHistory).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNtfyMessages(), { wrapper: createWrapper() });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
