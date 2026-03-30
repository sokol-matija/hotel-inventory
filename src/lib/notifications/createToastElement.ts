import type { NotificationType } from './types';
import { notificationIcons } from './icons';

/**
 * Build a notification DOM element (container + card) and append it to document.body.
 * Uses textContent for user-supplied strings to prevent XSS.
 */
export function createToastElement(
  type: NotificationType,
  title: string,
  message: string
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'hotel-notification-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '1000';
  container.style.opacity = '0';
  container.style.visibility = 'hidden';
  container.style.pointerEvents = 'none';

  const notification = document.createElement('div');
  notification.className = `hotel-notification ${type}`;

  notification.innerHTML = `
    <div class="hotel-notification-content">
      <div class="hotel-notification-icon">
        <svg viewBox="0 0 24 24" width="20" height="20">
          ${notificationIcons[type]}
        </svg>
      </div>
      <div class="hotel-notification-text">
        <h3 class="hotel-notification-title"></h3>
        <p class="hotel-notification-message"></p>
      </div>
      <button class="hotel-notification-close" aria-label="Close notification">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="none" d="M0 0h24v24H0z"/>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <div class="hotel-notification-progress">
      <div class="hotel-notification-progress-bar"></div>
    </div>
  `;

  // Set user-supplied text via textContent to prevent XSS
  const titleEl = notification.querySelector('.hotel-notification-title');
  const messageEl = notification.querySelector('.hotel-notification-message');
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;

  container.appendChild(notification);
  document.body.appendChild(container);

  return container;
}
