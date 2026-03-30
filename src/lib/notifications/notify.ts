import type { NotificationType } from './types';
import type { ActiveNotification } from './positionStack';
import { createToastElement } from './createToastElement';
import { animateToast } from './animateToast';
import './notification.css';

const DEBOUNCE_DELAY = 2000; // 2 seconds

/** Shared mutable state */
const activeNotifications: ActiveNotification[] = [];
const lastNotificationTime = new Map<string, number>();
let stylesEnsured = false;

/** Inject styles once (idempotent -- CSS file import handles this, but guard against double-init) */
function ensureStyles(): void {
  if (stylesEnsured) return;
  stylesEnsured = true;
  // The CSS import at the top of this file is sufficient for Vite.
  // This guard exists only so future callers don't need to worry about ordering.
}

/**
 * Core notification dispatcher.
 * Deduplicates by type+title within the debounce window, builds the DOM element,
 * and hands it off to the GSAP animation pipeline.
 */
function show(
  type: NotificationType,
  title: string,
  message: string,
  duration: number
): gsap.core.Timeline | null {
  // Debounce duplicate notifications
  const key = `${type}-${title}`;
  const now = Date.now();
  const lastTime = lastNotificationTime.get(key) || 0;

  if (now - lastTime < DEBOUNCE_DELAY) {
    return null;
  }

  lastNotificationTime.set(key, now);
  ensureStyles();

  const container = createToastElement(type, title, message);
  return animateToast(container, duration, activeNotifications);
}

/** Public API -- matches the original hotelNotification singleton interface */
const notify = {
  success(
    title: string = 'Success!',
    message: string = 'Your action has been completed successfully.',
    duration: number = 4
  ): gsap.core.Timeline | null {
    return show('success', title, message, duration);
  },

  error(
    title: string = 'Error!',
    message: string = 'Something went wrong. Please try again.',
    duration: number = 5
  ): gsap.core.Timeline | null {
    return show('error', title, message, duration);
  },

  info(
    title: string = 'Information',
    message: string = 'Here is some important information for you.',
    duration: number = 4
  ): gsap.core.Timeline | null {
    return show('info', title, message, duration);
  },

  warning(
    title: string = 'Warning',
    message: string = 'Please pay attention to this information.',
    duration: number = 5
  ): gsap.core.Timeline | null {
    return show('warning', title, message, duration);
  },
};

export default notify;
