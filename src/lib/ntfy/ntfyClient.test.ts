import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MOBILE_TOPIC,
  STAFF_TOPIC,
  ntfyPollHistory,
  ntfyPublish,
  ntfySubscribeSSE,
  sendRoom401BookingNotification,
} from './ntfyClient';

// ── EventSource mock ──────────────────────────────────────────────────────────

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  /** Test helper: simulate an incoming SSE frame */
  emit(payload: object) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── ntfyPublish ───────────────────────────────────────────────────────────────

describe('ntfyPublish', () => {
  it('POSTs to the correct ntfy URL with the message body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await ntfyPublish({ topic: 'my-topic', message: 'hello world' });

    expect(fetch).toHaveBeenCalledWith(
      'https://ntfy.sh/my-topic',
      expect.objectContaining({ method: 'POST', body: 'hello world' })
    );
  });

  it('sends optional Title, Priority, and Tags headers', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await ntfyPublish({
      topic: 'my-topic',
      message: 'msg',
      title: 'Alert',
      priority: 'high',
      tags: 'hotel,alert',
    });

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts as RequestInit).headers).toMatchObject({
      Title: 'Alert',
      Priority: 'high',
      Tags: 'hotel,alert',
    });
  });

  it('omits optional headers when not provided', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await ntfyPublish({ topic: 'my-topic', message: 'msg' });

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers['Title']).toBeUndefined();
    expect(headers['Priority']).toBeUndefined();
  });

  it('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 500, statusText: 'Server Error' })
    );

    await expect(ntfyPublish({ topic: 'my-topic', message: 'msg' })).rejects.toThrow(
      'ntfy publish failed'
    );
  });
});

// ── ntfyPollHistory ───────────────────────────────────────────────────────────

describe('ntfyPollHistory', () => {
  it('fetches with correct URL including since param', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));

    await ntfyPollHistory('hotel-porec-staff', '12h');

    expect(fetch).toHaveBeenCalledWith('https://ntfy.sh/hotel-porec-staff/json?poll=1&since=12h');
  });

  it('defaults since to 24h', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));

    await ntfyPollHistory('hotel-porec-staff');

    expect(fetch).toHaveBeenCalledWith('https://ntfy.sh/hotel-porec-staff/json?poll=1&since=24h');
  });

  it('parses NDJSON and returns only message events, newest first', async () => {
    const lines = [
      { id: '1', time: 100, event: 'message', topic: 't', message: 'first' },
      { id: '2', time: 200, event: 'message', topic: 't', message: 'second' },
    ]
      .map((o) => JSON.stringify(o))
      .join('\n');

    vi.mocked(fetch).mockResolvedValue(new Response(lines, { status: 200 }));

    const result = await ntfyPollHistory('t');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('2'); // reversed → newest first
    expect(result[1].id).toBe('1');
  });

  it('filters out open and keepalive events', async () => {
    const lines = [
      JSON.stringify({ id: '1', time: 100, event: 'open', topic: 't' }),
      JSON.stringify({ id: '2', time: 200, event: 'message', topic: 't', message: 'real' }),
      JSON.stringify({ id: '3', time: 300, event: 'keepalive', topic: 't' }),
    ].join('\n');

    vi.mocked(fetch).mockResolvedValue(new Response(lines, { status: 200 }));

    const result = await ntfyPollHistory('t');

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('real');
  });

  it('returns empty array when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    expect(await ntfyPollHistory('t')).toEqual([]);
  });

  it('returns empty array for empty response body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));

    expect(await ntfyPollHistory('t')).toEqual([]);
  });
});

// ── ntfySubscribeSSE ──────────────────────────────────────────────────────────

describe('ntfySubscribeSSE', () => {
  it('creates EventSource pointing at the correct SSE URL', () => {
    const cleanup = ntfySubscribeSSE('my-topic', vi.fn());

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('https://ntfy.sh/my-topic/sse');

    cleanup();
  });

  it('calls onMessage for message events', () => {
    const onMessage = vi.fn();
    ntfySubscribeSSE('my-topic', onMessage);

    const es = MockEventSource.instances[0];
    const payload = { id: '42', time: 999, event: 'message', topic: 'my-topic', message: 'hi' };
    es.emit(payload);

    expect(onMessage).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith(payload);
  });

  it('ignores open and keepalive frames', () => {
    const onMessage = vi.fn();
    ntfySubscribeSSE('my-topic', onMessage);

    const es = MockEventSource.instances[0];
    es.emit({ event: 'open', topic: 'my-topic' });
    es.emit({ event: 'keepalive', topic: 'my-topic' });

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('silently ignores malformed JSON frames', () => {
    const onMessage = vi.fn();
    ntfySubscribeSSE('my-topic', onMessage);

    const es = MockEventSource.instances[0];
    expect(() => {
      es.onmessage?.({ data: 'not-valid-json' });
    }).not.toThrow();

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('closes the EventSource on cleanup', () => {
    const cleanup = ntfySubscribeSSE('my-topic', vi.fn());
    const es = MockEventSource.instances[0];

    expect(es.closed).toBe(false);
    cleanup();
    expect(es.closed).toBe(true);
  });
});

// ── sendRoom401BookingNotification ────────────────────────────────────────────

describe('sendRoom401BookingNotification', () => {
  const baseData = {
    roomNumber: '401',
    guestName: 'John Doe',
    checkIn: '2026-04-01',
    checkOut: '2026-04-05',
    nights: 4,
    adults: 2,
    children: 0,
    bookingSource: 'Direct',
  };

  it('returns false without calling fetch for non-401 rooms', async () => {
    const result = await sendRoom401BookingNotification({ ...baseData, roomNumber: '202' });

    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('publishes to MOBILE_TOPIC and returns true for room 401', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const result = await sendRoom401BookingNotification(baseData);

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      `https://ntfy.sh/${MOBILE_TOPIC}`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('anonymises guest name to initials (PII reduction on public topic)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await sendRoom401BookingNotification(baseData);

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = (opts as RequestInit).body as string;
    expect(body).toContain('J. D.');
    expect(body).not.toContain('John Doe');
  });

  it('includes total amount when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await sendRoom401BookingNotification({ ...baseData, totalAmount: 480 });

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts as RequestInit).body as string).toContain('€480.00');
  });

  it('omits total amount line when not provided', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await sendRoom401BookingNotification(baseData);

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts as RequestInit).body as string).not.toContain('€');
  });

  it('returns false when publish throws', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500, statusText: 'Error' }));

    const result = await sendRoom401BookingNotification(baseData);

    expect(result).toBe(false);
  });

  it('exports expected topic constants', () => {
    expect(MOBILE_TOPIC).toBe('hotel-porec-room-401');
    expect(STAFF_TOPIC).toBe('hotel-porec-staff');
  });
});
