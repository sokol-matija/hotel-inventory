import type { NotificationType } from './types';

/** SVG path strings for each notification type (inside a 24x24 viewBox) */
export const notificationIcons: Record<NotificationType, string> = {
  success: `<path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>`,
  error: `<path fill="none" d="M0 0h24v24H0z"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>`,
  info: `<path fill="none" d="M0 0h24v24H0z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>`,
  warning: `<path fill="none" d="M0 0h24v24H0z"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2zm0 4.15L9.85 8.5 7.22 8.95l2.28 2.23-.54 3.18L12 13.13l3.04 1.23-.54-3.18 2.28-2.23-2.63-.45L12 6.15z" fill="currentColor"/>`,
};
