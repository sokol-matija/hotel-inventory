# Push Notification System Plan

## Features to Implement
1. **Expiration Notifications**: 
   - 30 days: Yellow warning
   - 7 days: Red warning  
   - 1 day: Critical red alert
2. **Daily 7am notifications**
3. **Browser + Mobile push notifications**
4. **Settings toggle to enable/disable**
5. **Supabase Edge Functions for automation**

## Architecture
- **Frontend**: Service Worker for push notifications
- **Backend**: Supabase Edge Function scheduled at 7am daily
- **Database**: notification_preferences table
- **Push Service**: Web Push API with VAPID keys

## Issues Found
- **Loading Problem**: AuthProvider has 15s timeout and race conditions
- **Current Toast System**: Already exists but only for in-app notifications
- **Expiration Logic**: Already implemented but only for 7-day warnings

## Implementation Plan
1. Fix AuthProvider loading optimization
2. Add notification_preferences to user_profiles table
3. Create Settings component with toggle
4. Implement Web Push API
5. Create Supabase Edge Function
6. Update expiration logic for 30/7/1 day thresholds
7. Write comprehensive tests