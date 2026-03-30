import { gsap } from 'gsap';

export interface ActiveNotification {
  container: HTMLElement;
  height: number;
  timeline: gsap.core.Timeline;
}

const NOTIFICATION_GAP = 12;

/** Repositions all active notifications so they stack upward from the bottom-right. */
export function positionStack(activeNotifications: ActiveNotification[]): void {
  let currentOffset = 0;

  // Position from bottom to top (reverse order for stacking upwards)
  for (let i = activeNotifications.length - 1; i >= 0; i--) {
    const notification = activeNotifications[i];
    gsap.to(notification.container, {
      y: -currentOffset,
      duration: 0.3,
      ease: 'power2.out',
    });

    const height = notification.height || 80;
    currentOffset += height + NOTIFICATION_GAP;
  }
}
