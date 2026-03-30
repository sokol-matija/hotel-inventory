import { gsap } from 'gsap';
import type { ActiveNotification } from './positionStack';
import { positionStack } from './positionStack';

/**
 * Create and run the entrance / progress / exit GSAP timeline for a notification.
 * Returns the timeline so callers can force-complete it (e.g. close button).
 */
export function animateToast(
  notificationContainer: HTMLElement,
  duration: number,
  activeNotifications: ActiveNotification[]
): gsap.core.Timeline {
  const notification = notificationContainer.querySelector('.hotel-notification') as HTMLElement;
  const progressBar = notification.querySelector('.hotel-notification-progress-bar') as HTMLElement;
  const closeButton = notification.querySelector('.hotel-notification-close') as HTMLElement;

  // Add to active notifications
  const notificationObj: ActiveNotification = {
    container: notificationContainer,
    height: 0,
    timeline: gsap.timeline(),
  };
  activeNotifications.push(notificationObj);

  // Position notifications
  positionStack(activeNotifications);

  // Create timeline
  const tl = gsap.timeline({
    onComplete: () => {
      // Remove from active notifications
      const index = activeNotifications.findIndex((n) => n.container === notificationContainer);
      if (index !== -1) {
        activeNotifications.splice(index, 1);
      }

      // Remove DOM element
      if (document.body.contains(notificationContainer)) {
        document.body.removeChild(notificationContainer);
      }

      // Reposition remaining notifications
      positionStack(activeNotifications);
    },
  });

  notificationObj.timeline = tl;

  // Show container
  tl.set(notificationContainer, {
    visibility: 'visible',
    pointerEvents: 'auto',
  });

  // Animate in
  tl.fromTo(
    notificationContainer,
    {
      opacity: 0,
      x: 30,
      scale: 0.95,
    },
    {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.2)',
      onComplete: () => {
        // Set height after animation
        notificationObj.height = notificationContainer.offsetHeight;
        positionStack(activeNotifications);
      },
    }
  );

  // Animate icon
  tl.fromTo(
    notification.querySelector('.hotel-notification-icon'),
    {
      scale: 0,
      rotation: -180,
    },
    {
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'back.out(2)',
    },
    '-=0.2'
  );

  // Animate progress bar
  tl.fromTo(
    progressBar,
    {
      scaleX: 0,
    },
    {
      scaleX: 1,
      duration: duration,
      ease: 'none',
    },
    '<'
  );

  // Animate out
  tl.to(notificationContainer, {
    opacity: 0,
    x: 50,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
  });

  // Close button handler
  closeButton.addEventListener('click', () => {
    tl.progress(1);
  });

  return tl;
}
