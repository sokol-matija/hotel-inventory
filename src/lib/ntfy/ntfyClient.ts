import type { NtfyMessage, NtfyPublishOptions } from './types';

const NTFY_BASE = 'https://ntfy.sh';

export const MOBILE_TOPIC = import.meta.env.VITE_NTFY_TOPIC ?? 'hotel-porec-room-401';
export const STAFF_TOPIC = import.meta.env.VITE_NTFY_STAFF_TOPIC ?? 'hotel-porec-staff';

export async function ntfyPublish(options: NtfyPublishOptions): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
  if (options.title) headers['Title'] = options.title;
  if (options.priority) headers['Priority'] = options.priority;
  if (options.tags) headers['Tags'] = options.tags;

  const res = await fetch(`${NTFY_BASE}/${options.topic}`, {
    method: 'POST',
    headers,
    body: options.message,
  });

  if (!res.ok) throw new Error(`ntfy publish failed: ${res.statusText}`);
}

export async function ntfyPollHistory(topic: string, since = '24h'): Promise<NtfyMessage[]> {
  const res = await fetch(`${NTFY_BASE}/${topic}/json?poll=1&since=${since}`);
  if (!res.ok) return [];
  const text = await res.text();
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as NtfyMessage)
    .filter((msg) => msg.event === 'message')
    .reverse(); // newest first
}

export function ntfySubscribeSSE(topic: string, onMessage: (msg: NtfyMessage) => void): () => void {
  const es = new EventSource(`${NTFY_BASE}/${topic}/sse`);
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as NtfyMessage;
      if (msg.event === 'message') onMessage(msg);
    } catch {
      // ignore malformed frames
    }
  };
  return () => es.close();
}

// ── Staff bell helper ────────────────────────────────────────────────────────

/** Fire-and-forget publish to STAFF_TOPIC. Never throws — safe to call without await. */
export async function ntfyStaffNotify(
  title: string,
  message: string,
  priority: NtfyPublishOptions['priority'] = 'default',
  tags?: string
): Promise<void> {
  try {
    await ntfyPublish({ topic: STAFF_TOPIC, title, message, priority, tags });
  } catch {
    // intentionally swallowed — notifications must never block the UI
  }
}

// ── Booking helpers (kept DRY — single publish call) ────────────────────────

export interface BookingNotificationData {
  roomNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  bookingSource: string;
  totalAmount?: number;
}

export async function sendRoom401BookingNotification(
  data: BookingNotificationData
): Promise<boolean> {
  if (data.roomNumber !== '401') return false;

  const guestCount = data.adults + data.children;
  const initials = data.guestName
    .split(' ')
    .map((n) => n[0] + '.')
    .join(' ');

  const message = [
    `📍 Room: ${data.roomNumber}`,
    `👤 Guest: ${initials}`,
    `📅 Check-in: ${data.checkIn}`,
    `📅 Check-out: ${data.checkOut}`,
    `🌙 Nights: ${data.nights}`,
    `👥 ${guestCount} ${guestCount === 1 ? 'guest' : 'guests'} (${data.adults} adults${data.children > 0 ? `, ${data.children} children` : ''})`,
    `🔗 Source: ${data.bookingSource}`,
    ...(data.totalAmount ? [`💰 Total: €${data.totalAmount.toFixed(2)}`] : []),
  ].join('\n');

  try {
    await ntfyPublish({
      topic: MOBILE_TOPIC,
      message,
      title: 'New Room 401 Booking',
      priority: 'default',
      tags: 'hotel,booking,room401',
    });
    return true;
  } catch {
    return false;
  }
}
