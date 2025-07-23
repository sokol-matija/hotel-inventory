# Push Notifications Setup Guide

This guide explains how to set up and deploy the push notification system for expiring inventory items.

## Features Implemented

### 🔔 Push Notification System
- **Browser push notifications** for inventory expiration alerts
- **Severity levels**: 30-day (yellow), 7-day (orange), 1-day (red critical)
- **Daily notifications** at 7:00 AM local time
- **User preferences** - toggle notifications on/off
- **Settings page** for notification management

### 🚀 Fixed Issues
- **Slow loading after inactivity** - Optimized AuthProvider with proper cleanup
- **Enhanced expiration tracking** - Extended from 7 days to 30 days with color coding

## Installation Steps

### 1. Database Migration
Run the database migration to add notification preferences:

```sql
-- Execute migrations/add_notification_preferences.sql in your Supabase SQL editor
-- This adds push_notifications_enabled and push_subscription columns
```

### 2. Environment Variables
Add these environment variables to your deployment:

```bash
# VAPID Keys for Web Push (generate at https://vapidkeys.com)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# FCM Server Key (optional, for enhanced push delivery)
FCM_SERVER_KEY=your_fcm_server_key
```

### 3. Supabase Edge Function Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the edge function
supabase functions deploy daily-notifications
```

### 4. Schedule Daily Notifications

#### Option A: Using Supabase Cron (Recommended)
```sql
-- Run this in your Supabase SQL editor
SELECT cron.schedule(
    'daily-notifications-7am',
    '0 7 * * *',
    'SELECT net.http_post(
        url := ''https://YOUR_PROJECT_REF.functions.supabase.co/daily-notifications'',
        headers := jsonb_build_object(''Authorization'', ''Bearer YOUR_ANON_KEY'')
    );'
);
```

#### Option B: External Cron Service
Use services like GitHub Actions, Vercel Cron, or cron-job.org to call:
```
POST https://YOUR_PROJECT_REF.functions.supabase.co/daily-notifications
Authorization: Bearer YOUR_ANON_KEY
```

### 5. Service Worker Registration
The service worker is automatically registered at `/sw.js`. Ensure your deployment serves this file correctly.

## Configuration

### Push Notification Severity Levels

| Days Until Expiration | Severity | Color | Icon |
|----------------------|----------|-------|------|
| 1 day | Critical | Red | 🚨 |
| 2-7 days | Warning | Orange | ⚠️ |
| 8-30 days | Info | Yellow | 💛 |

### VAPID Keys Generation
1. Visit https://vapidkeys.com/
2. Generate a new key pair
3. Add the public key to `src/lib/pushNotifications.ts`
4. Add the private key to your environment variables

## Testing

### 1. Test Push Notifications Locally
```bash
# Run the development server
npm start

# Navigate to /settings
# Toggle push notifications on
# Click "Send Test Notification"
```

### 2. Test Edge Function
```bash
# Test the edge function directly
curl -X POST https://YOUR_PROJECT_REF.functions.supabase.co/daily-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 3. Test Expiration Logic
Create test inventory items with expiration dates 1, 7, and 30 days from today to verify color coding and notifications.

## User Experience

### Settings Page
- Access via `/settings` in the navigation
- Toggle push notifications on/off
- View notification schedule
- Send test notifications
- See browser support status

### Dashboard Enhancements
- Color-coded expiration badges (red/orange/yellow)
- Extended expiration tracking (30 days instead of 7)
- Updated statistics to show items expiring within 30 days

## Troubleshooting

### Common Issues

**"Push notifications not supported"**
- Ensure HTTPS is enabled (required for service workers)
- Check browser compatibility (Chrome 42+, Firefox 44+, Safari 16+)

**Notifications not received**
- Verify user has granted notification permission
- Check if service worker is registered correctly
- Ensure push subscription is saved to database

**Edge function fails**
- Check Supabase function logs
- Verify environment variables are set
- Ensure database functions have proper permissions

### Browser Compatibility
- ✅ Chrome 42+
- ✅ Firefox 44+
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ✅ Edge 17+
- ❌ Internet Explorer (not supported)

### Security Considerations
- Push notifications only work over HTTPS
- VAPID keys should be kept secure
- Service worker scope is limited to origin
- User permission is required for all notifications

## Monitoring

### Check Notification Status
```sql
-- See how many users have notifications enabled
SELECT COUNT(*) as enabled_users 
FROM user_profiles 
WHERE push_notifications_enabled = true;

-- See upcoming expiring items
SELECT * FROM get_expiring_inventory(30);
```

### Edge Function Logs
Monitor the edge function logs in Supabase Dashboard → Edge Functions → daily-notifications → Logs

## Future Enhancements

Planned features for future releases:
- Email notifications as fallback
- Custom notification times
- Category-specific notification preferences
- Slack/Teams integration
- Mobile app push notifications (React Native)
- Notification history and analytics

## Support

For issues with the notification system:
1. Check browser console for JavaScript errors
2. Verify service worker registration in DevTools
3. Check Supabase function logs
4. Ensure all environment variables are set correctly

---

**Last Updated**: January 23, 2025
**Version**: 1.0.0
**Supported Browsers**: Chrome 42+, Firefox 44+, Safari 16+, Edge 17+