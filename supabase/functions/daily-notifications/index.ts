// Daily Notifications Edge Function
// Runs at 7:00 AM daily to send push notifications for expiring items

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InventoryItem {
  id: number
  quantity: number
  expiration_date: string | null
  item: {
    name: string
    category: {
      requires_expiration: boolean
    }
  }
  location: {
    name: string
  }
}

interface UserWithSubscription {
  user_id: string
  push_notifications_enabled: boolean
  push_subscription: string | null
}

interface NotificationPayload {
  title: string
  body: string
  icon: string
  data: {
    type: string
    severity: 'info' | 'warning' | 'critical'
    url: string
  }
}

// VAPID keys - In production, these should be environment variables
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'YOUR_VAPID_PRIVATE_KEY'
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa40HpAgoVk-sJDIcg1lWOLxF_mDcmYgCPKe5e8Ss7aP-MpzkvOjmiqTHE1dSY'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting daily notifications check...')

    // Get current date and calculate thresholds
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000))

    // Get all inventory items with expiration dates within 30 days
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        id,
        quantity,
        expiration_date,
        item:items(
          name,
          category:categories(requires_expiration)
        ),
        location:locations(name)
      `)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', thirtyDaysFromNow.toISOString())
      .gte('expiration_date', now.toISOString())

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError)
      throw inventoryError
    }

    console.log(`Found ${inventoryItems?.length || 0} items expiring within 30 days`)

    // Get users with push notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id, push_notifications_enabled, push_subscription')
      .eq('push_notifications_enabled', true)
      .not('push_subscription', 'is', null)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    console.log(`Found ${users?.length || 0} users with notifications enabled`)

    if (!inventoryItems || inventoryItems.length === 0 || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No notifications to send',
          items_found: inventoryItems?.length || 0,
          users_found: users?.length || 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Group items by severity
    const criticalItems: InventoryItem[] = []
    const warningItems: InventoryItem[] = []
    const infoItems: InventoryItem[] = []

    inventoryItems.forEach((item: InventoryItem) => {
      if (!item.expiration_date || !item.item.category.requires_expiration) return

      const expirationDate = new Date(item.expiration_date)
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiration <= 1) {
        criticalItems.push(item)
      } else if (daysUntilExpiration <= 7) {
        warningItems.push(item)
      } else if (daysUntilExpiration <= 30) {
        infoItems.push(item)
      }
    })

    console.log(`Items by severity - Critical: ${criticalItems.length}, Warning: ${warningItems.length}, Info: ${infoItems.length}`)

    // Send notifications to each user
    const notificationPromises: Promise<void>[] = []

    for (const user of users as UserWithSubscription[]) {
      try {
        const subscription = JSON.parse(user.push_subscription!)
        
        // Send critical notifications first
        if (criticalItems.length > 0) {
          const criticalNotification = createNotificationPayload(
            criticalItems,
            'critical',
            '🚨 Critical: Items Expire Today!'
          )
          notificationPromises.push(sendPushNotification(subscription, criticalNotification))
        }

        // Send warning notifications
        if (warningItems.length > 0) {
          const warningNotification = createNotificationPayload(
            warningItems,
            'warning',
            '⚠️ Warning: Items Expire This Week'
          )
          notificationPromises.push(sendPushNotification(subscription, warningNotification))
        }

        // Send info notifications (only if no critical or warning items)
        if (infoItems.length > 0 && criticalItems.length === 0 && warningItems.length === 0) {
          const infoNotification = createNotificationPayload(
            infoItems,
            'info',
            '💛 Notice: Items Expire Within 30 Days'
          )
          notificationPromises.push(sendPushNotification(subscription, infoNotification))
        }

      } catch (subscriptionError) {
        console.error(`Error processing user ${user.user_id}:`, subscriptionError)
      }
    }

    // Wait for all notifications to be sent
    await Promise.allSettled(notificationPromises)

    console.log(`Sent ${notificationPromises.length} notifications`)

    return new Response(
      JSON.stringify({ 
        message: 'Daily notifications sent successfully',
        notifications_sent: notificationPromises.length,
        items_by_severity: {
          critical: criticalItems.length,
          warning: warningItems.length,
          info: infoItems.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in daily notifications:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function createNotificationPayload(
  items: InventoryItem[], 
  severity: 'info' | 'warning' | 'critical',
  title: string
): NotificationPayload {
  const itemCount = items.length
  const firstItem = items[0]
  
  let body: string
  let icon: string

  if (itemCount === 1) {
    const now = new Date()
    const expirationDate = new Date(firstItem.expiration_date!)
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    body = `${firstItem.item.name} (${firstItem.quantity} units) at ${firstItem.location.name} expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`
  } else {
    body = `${itemCount} items are expiring soon across multiple locations. Check your dashboard for details.`
  }

  switch (severity) {
    case 'critical':
      icon = '/icons/critical-notification.png'
      break
    case 'warning':
      icon = '/icons/warning-notification.png'
      break
    default:
      icon = '/icons/info-notification.png'
  }

  return {
    title,
    body,
    icon,
    data: {
      type: 'expiration',
      severity,
      url: '/dashboard'
    }
  }
}

async function sendPushNotification(subscription: any, payload: NotificationPayload): Promise<void> {
  try {
    // For now, we'll use a simple HTTP request to a Web Push service
    // In production, you'd want to use a proper Web Push library
    console.log('Sending push notification:', payload.title)
    
    // This is a simplified implementation
    // In production, you'd use the web-push library or similar
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY') || 'YOUR_FCM_SERVER_KEY'}`
      },
      body: JSON.stringify({
        to: subscription.keys?.p256dh || subscription.endpoint,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          data: payload.data
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Push notification failed: ${response.statusText}`)
    }

    console.log('Push notification sent successfully')
  } catch (error) {
    console.error('Error sending push notification:', error)
    throw error
  }
}

/* To deploy this function:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy daily-notifications

To schedule this function to run daily at 7 AM:
1. Go to your Supabase dashboard
2. Navigate to Edge Functions
3. Create a new cron job:
   - Name: daily-notifications-cron
   - Schedule: 0 7 * * * (runs at 7 AM UTC every day)
   - Function: daily-notifications

Or use pg_cron in your database:
SELECT cron.schedule('daily-notifications', '0 7 * * *', 'SELECT net.http_post(url := ''https://YOUR_PROJECT_REF.functions.supabase.co/daily-notifications'', headers := jsonb_build_object(''Authorization'', ''Bearer YOUR_ANON_KEY''));');
*/