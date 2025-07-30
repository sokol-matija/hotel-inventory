// Service Worker for Push Notifications
const CACHE_NAME = 'hotel-inventory-v2'; // Updated version to force refresh

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'Hotel Inventory Notification',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Set notification options based on severity
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/logo192.png',
    data: notificationData.data || {},
    tag: notificationData.tag || 'hotel-inventory',
    requireInteraction: notificationData.data?.severity === 'critical',
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ],
    // Vibration pattern based on severity
    vibrate: getVibrationPattern(notificationData.data?.severity || 'info')
  };

  // Add severity-specific styling
  if (notificationData.data?.severity === 'critical') {
    options.silent = false;
    options.renotify = true;
  } else if (notificationData.data?.severity === 'warning') {
    options.silent = false;
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    options
  );

  event.waitUntil(promiseChain);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return; // Just close the notification
  }

  // Default action or 'view' action
  const urlToOpen = data?.url || '/dashboard';

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    // Check if there's already a window/tab open with the target URL
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url.includes(urlToOpen) && 'focus' in client) {
        return client.focus();
      }
    }

    // If no existing window/tab is found, open a new one
    if (clients.openWindow) {
      const baseUrl = self.location.origin;
      return clients.openWindow(baseUrl + urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(
      // Here you could implement offline notification queuing
      console.log('Processing background notification sync')
    );
  }
});

// Helper function to get vibration pattern based on severity
function getVibrationPattern(severity) {
  switch (severity) {
    case 'critical':
      return [200, 100, 200, 100, 200]; // Urgent pattern
    case 'warning':
      return [100, 50, 100]; // Medium pattern
    case 'info':
    default:
      return [100]; // Simple pattern
  }
}

// REMOVED FETCH HANDLER - it was causing button freeze when switching tabs
// Service worker now only handles push notifications, not request caching