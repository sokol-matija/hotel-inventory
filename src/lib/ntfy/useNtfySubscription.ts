import { useEffect } from 'react';
import { ntfySubscribeSSE, STAFF_TOPIC } from './ntfyClient';
import type { NtfyMessage } from './types';

export function useNtfySubscription(onMessage: (msg: NtfyMessage) => void) {
  useEffect(() => {
    const cleanup = ntfySubscribeSSE(STAFF_TOPIC, onMessage);
    return cleanup;
  }, [onMessage]);
}
