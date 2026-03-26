import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ntfyPollHistory, STAFF_TOPIC } from './ntfyClient';
import { queryKeys } from '@/lib/queries/queryKeys';
import type { NtfyMessage } from './types';

const LAST_READ_KEY = 'ntfy_last_read';

function getLastReadAt(): number {
  return parseInt(localStorage.getItem(LAST_READ_KEY) ?? '0', 10);
}

export function useNtfyMessages() {
  const queryClient = useQueryClient();
  const [lastReadAt, setLastReadAt] = useState<number>(getLastReadAt);

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

  const appendMessage = useCallback(
    (msg: NtfyMessage) => {
      queryClient.setQueryData<NtfyMessage[]>(queryKeys.ntfy.history(), (old) => [
        msg,
        ...(old ?? []),
      ]);
    },
    [queryClient]
  );

  const messages: NtfyMessage[] = query.data ?? [];
  const unreadCount = messages.filter((m) => m.time * 1000 > lastReadAt).length;

  return { messages, unreadCount, markAllRead, appendMessage, isLoading: query.isLoading };
}
