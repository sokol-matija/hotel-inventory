import { supabase } from './supabase'

// VAPID keys - In production, these should be environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HpAgoVk-sJDIcg1lWOLxF_mDcmYgCPKe5e8Ss7aP-MpzkvOjmiqTHE1dSY'

export interface PushNotification {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
  tag?: string
}

export type NotificationSeverity = 'info' | 'warning' | 'critical'

// Convert VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Request permission for push notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Register service worker and get push subscription
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      throw new Error('Push notifications are not supported')
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    return subscription
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        return true
      }
    }
    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

// Save push subscription to database
export async function savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        push_subscription: JSON.stringify(subscription),
        push_notifications_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error saving push subscription:', error)
    throw error
  }
}

// Remove push subscription from database  
export async function removePushSubscription(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        push_subscription: null,
        push_notifications_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error removing push subscription:', error)
    throw error
  }
}

// Toggle push notifications
export async function togglePushNotifications(userId: string, enabled: boolean): Promise<boolean> {
  try {
    if (enabled) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      const subscription = await subscribeToPushNotifications()
      if (!subscription) {
        throw new Error('Failed to get push subscription')
      }

      await savePushSubscription(userId, subscription)
      return true
    } else {
      await unsubscribeFromPushNotifications()
      await removePushSubscription(userId)
      return false
    }
  } catch (error) {
    console.error('Error toggling push notifications:', error)
    throw error
  }
}

// Send local notification (fallback for testing)
export function sendLocalNotification(notification: PushNotification): void {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return
  }

  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/logo192.png',
      badge: notification.badge || '/logo192.png',
      data: notification.data,
      tag: notification.tag
    })
  }
}

// Get notification color based on severity
export function getNotificationSeverity(daysUntilExpiration: number): NotificationSeverity {
  if (daysUntilExpiration <= 1) {
    return 'critical'
  } else if (daysUntilExpiration <= 7) {
    return 'warning'
  } else if (daysUntilExpiration <= 30) {
    return 'info'
  }
  return 'info'
}

// Create expiration notification
export function createExpirationNotification(
  itemName: string, 
  locationName: string, 
  daysUntilExpiration: number,
  quantity: number
): PushNotification {
  const severity = getNotificationSeverity(daysUntilExpiration)
  
  let title: string
  let icon: string
  
  if (daysUntilExpiration <= 1) {
    title = '🚨 Critical: Item Expires Today!'
    icon = '/icons/critical-notification.png'
  } else if (daysUntilExpiration <= 7) {
    title = '⚠️ Warning: Item Expires Soon'
    icon = '/icons/warning-notification.png'
  } else {
    title = '💛 Notice: Item Expires in 30 Days'
    icon = '/icons/info-notification.png'
  }

  const body = `${itemName} (${quantity} units) at ${locationName} expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`

  return {
    title,
    body,
    icon,
    badge: '/logo192.png',
    tag: `expiration-${itemName}-${locationName}`,
    data: {
      type: 'expiration',
      severity,
      itemName,
      locationName,
      daysUntilExpiration,
      quantity,
      url: '/dashboard'
    }
  }
}