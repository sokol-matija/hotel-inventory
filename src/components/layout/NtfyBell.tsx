import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNtfyMessages } from '@/lib/ntfy/useNtfyMessages';
import { useNtfySubscription } from '@/lib/ntfy/useNtfySubscription';
import type { NtfyMessage } from '@/lib/ntfy/types';

const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-gray-400',
  2: 'bg-blue-400',
  3: 'bg-green-500',
  4: 'bg-orange-500',
  5: 'bg-red-600',
};

function MessageItem({ msg }: { msg: NtfyMessage }) {
  const dot = PRIORITY_COLOR[msg.priority ?? 3] ?? PRIORITY_COLOR[3];
  const ago = formatDistanceToNow(new Date(msg.time * 1000), { addSuffix: true });

  return (
    <div className="border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          {msg.title && <p className="truncate text-sm font-medium text-gray-900">{msg.title}</p>}
          <p className="mt-0.5 text-sm break-words text-gray-700">{msg.message}</p>
          <p className="mt-1 text-xs text-gray-400">{ago}</p>
        </div>
      </div>
    </div>
  );
}

export default function NtfyBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { messages, unreadCount, markAllRead, appendMessage, isLoading } = useNtfyMessages();

  const handleNewMessage = useCallback((msg: NtfyMessage) => appendMessage(msg), [appendMessage]);
  useNtfySubscription(handleNewMessage);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) markAllRead();
  }

  return (
    <div ref={ref} className="fixed top-4 right-4 z-50">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-12 right-0 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {messages.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700">
                Mark all read
              </button>
            )}
          </div>

          {/* Message list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                Loading…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Bell className="h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
