# Room 401 Booking Notifications Setup

## Overview
This system sends push notifications to your mobile phone whenever a new reservation is created for Room 401 using the ntfy.sh service.

## Mobile App Setup (5 minutes)

### Step 1: Install the ntfy app
- **Android**: [Download from Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- **iPhone**: [Download from App Store](https://apps.apple.com/us/app/ntfy/id1625396347)

### Step 2: Subscribe to Room 401 notifications
1. Open the ntfy app on your phone
2. Tap "Subscribe to topic" (+ button)
3. Enter the topic name: `hotel-porec-room-401`
4. Tap "Subscribe"
5. You're all set! 🎉

## What notifications will you receive?
You'll get push notifications that look like this:

**Title**: 🏨 New Room 401 Booking

**Message**:
```
🏨 New Booking Created

📍 Room: 401
👤 Guest: John Doe
📅 Check-in: 15.08.2025
📅 Check-out: 18.08.2025
🌙 Nights: 3
👥 2 guests (2 adults)
🔗 Source: booking.com
💰 Total: €450.00
```

## Important Notes

### Only Room 401
- Notifications are **only** sent for Room 401 bookings
- Other rooms (101, 102, 201, etc.) will **not** trigger notifications

### Notification Timing
- Notifications are sent **immediately** when a booking is created
- Works for both new guests and existing guests
- Works regardless of booking source (direct, Booking.com, etc.)

### Privacy & Security
- Uses public ntfy.sh service (free)
- Topic name is: `hotel-porec-room-401`
- No personal data is stored on ntfy servers
- Anyone who knows the topic name can subscribe

## Testing the System

### Test Notification
The system includes a test function. To test:
1. Create a booking for Room 401 in the hotel system
2. Check that your phone receives the notification
3. If you don't receive it, verify your topic subscription

### Troubleshooting
- **No notifications received**: Double-check the topic name is exactly `hotel-porec-room-401`
- **App not installed**: Make sure you downloaded the correct "ntfy" app
- **Topic not working**: Try unsubscribing and re-subscribing to the topic

## Technical Details

### Topic Configuration
- Default topic: `hotel-porec-room-401`
- Can be customized via environment variable: `REACT_APP_NTFY_TOPIC`
- Service URL: https://ntfy.sh

### Notification Format
- **Priority**: Default (normal notification sound)
- **Tags**: hotel,booking,room401
- **Content**: Room details, guest info, dates, pricing

### Integration Points
- Triggered from: `CreateBookingModal.tsx`
- Service location: `src/lib/ntfyService.ts`
- Only activated for room number "401"

## Need Help?

1. **App installation issues**: Check your device's app store
2. **No notifications**: Verify the topic name is correct
3. **Technical support**: Check the ntfy app's built-in help section

---

**Last Updated**: August 2025  
**System Status**: Active for Room 401 only