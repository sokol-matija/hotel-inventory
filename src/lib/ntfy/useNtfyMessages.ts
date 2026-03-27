import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ntfyPollHistory, STAFF_TOPIC } from './ntfyClient';
import { queryKeys } from '@/lib/queries/queryKeys';
import type { NtfyMessage } from './types';

const LAST_READ_KEY = 'ntfy_last_read';
const DISMISSED_KEY = 'ntfy_dismissed';

function getLastReadAt(): number {
  return parseInt(localStorage.getItem(LAST_READ_KEY) ?? '0', 10);
}

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function useNtfyMessages() {
  const queryClient = useQueryClient();
  const [lastReadAt, setLastReadAt] = useState<number>(getLastReadAt);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedIds);

  const query = useQuery({
    queryKey: queryKeys.ntfy.history(),
    queryFn: () => ntfyPollHistory(STAFF_TOPIC, '24h'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const markAllRead = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(LAST_READ_KEY, String(now));
    setLastReadAt(now);
  }, []);

  const dismissMessage = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    const allIds = new Set((query.data ?? []).map((m) => m.id));
    setDismissedIds((prev) => {
      const next = new Set([...prev, ...allIds]);
      saveDismissedIds(next);
      return next;
    });
    const now = Date.now();
    localStorage.setItem(LAST_READ_KEY, String(now));
    setLastReadAt(now);
  }, [query.data]);

  const appendMessage = useCallback(
    (msg: NtfyMessage) => {
      queryClient.setQueryData<NtfyMessage[]>(queryKeys.ntfy.history(), (old) => [
        msg,
        ...(old ?? []),
      ]);
    },
    [queryClient]
  );

  const messages: NtfyMessage[] = (query.data ?? []).filter((m) => !dismissedIds.has(m.id));
  const unreadCount = messages.filter((m) => m.time * 1000 > lastReadAt).length;

  return {
    messages,
    unreadCount,
    lastReadAt,
    markAllRead,
    dismissMessage,
    clearAll,
    appendMessage,
    isLoading: query.isLoading,
  };
}
