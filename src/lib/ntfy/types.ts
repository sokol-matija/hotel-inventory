export interface NtfyMessage {
  id: string;
  time: number; // Unix timestamp (seconds)
  event: 'message' | 'open' | 'keepalive';
  topic: string;
  title?: string;
  message?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  click?: string;
  expires?: number;
}

export interface NtfyPublishOptions {
  topic: string;
  message: string;
  title?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
  tags?: string;
}
