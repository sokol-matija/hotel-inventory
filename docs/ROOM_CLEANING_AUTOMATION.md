# Automated Room Cleaning Status Reset

## Overview

This system automatically marks rooms as "dirty" (needs cleaning) at 7:00 AM Europe/Zagreb time if they were occupied the previous day. This ensures housekeeping staff know which rooms need attention each morning.

## Architecture

### Components

1. **PostgreSQL Function**: `reset_daily_room_cleaning()`
2. **pg_cron Job**: Scheduled execution at 7:00 AM
3. **Supabase Edge Function**: Manual trigger endpoint
4. **Admin Testing Page**: UI for manual testing
5. **Audit Log Table**: Tracks all executions

### Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│  Daily at 7:00 AM (Europe/Zagreb)                   │
│  ┌───────────────────────────────┐                  │
│  │   pg_cron Scheduler           │                  │
│  └──────────┬────────────────────┘                  │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────────────────┐               │
│  │  reset_daily_room_cleaning()     │               │
│  │  - Find occupied rooms yesterday │               │
│  │  - Set is_cleaned = false        │               │
│  │  - Log execution                 │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Manual Trigger (Testing)                           │
│  ┌───────────────────────────────┐                  │
│  │   Admin Testing Page          │                  │
│  └──────────┬────────────────────┘                  │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────────────────┐               │
│  │  Edge Function:                  │               │
│  │  /functions/v1/reset-room-       │               │
│  │  cleaning                        │               │
│  └──────────┬───────────────────────┘               │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────────────────┐               │
│  │  reset_daily_room_cleaning()     │               │
│  │  trigger_source: 'manual'        │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

## Database Schema

### Function: reset_daily_room_cleaning()

**Parameters:**
- `trigger_source` (TEXT, default: 'automatic') - Source of the trigger ('automatic' or 'manual')

**Returns:**
```sql
TABLE (
  rooms_reset INTEGER,
  execution_time TIMESTAMPTZ
)
```

**Logic:**
1. Finds all rooms that had active reservations yesterday
2. Excludes cancelled and no-show reservations
3. Sets `is_cleaned = false` and updates `updated_at`
4. Logs the execution to `room_cleaning_reset_log`
5. Returns the count of affected rooms

### Table: room_cleaning_reset_log

Tracks all executions of the room cleaning reset function.

```sql
CREATE TABLE room_cleaning_reset_log (
  id SERIAL PRIMARY KEY,
  rooms_reset INTEGER NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_by TEXT DEFAULT 'automatic'
);
```

**Columns:**
- `id`: Unique identifier
- `rooms_reset`: Number of rooms affected
- `executed_at`: Timestamp of execution
- `triggered_by`: 'automatic' (pg_cron) or 'manual' (UI trigger)

### pg_cron Schedule

**Job Name:** `reset-daily-room-cleaning`
**Schedule:** `0 5 * * *` (5:00 AM UTC = 7:00 AM Europe/Zagreb during DST)
**Command:** `SELECT reset_daily_room_cleaning('automatic');`

**Note:** The schedule uses UTC time. Europe/Zagreb is UTC+1 (winter) or UTC+2 (summer/DST). We use 5:00 AM UTC to cover the summer tourism season when DST is active.

## Edge Function

### Endpoint
```
POST https://gkbpthurkucotikjefra.supabase.co/functions/v1/reset-room-cleaning
```

### Authentication
Requires authentication (JWT verification enabled).

### Request
```bash
curl -X POST \
  https://gkbpthurkucotikjefra.supabase.co/functions/v1/reset-room-cleaning \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

### Response (Success)
```json
{
  "success": true,
  "message": "Successfully reset 15 room(s)",
  "roomsReset": 15,
  "executionTime": "2025-08-27T07:00:00.123Z",
  "triggerSource": "manual"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Failed to reset room cleaning status",
  "details": "Error message here"
}
```

## Admin Testing Page

### Location
`/admin/testing`

### Features

1. **Manual Trigger Button**
   - Triggers the room cleaning reset function manually
   - Shows loading state during execution
   - Displays results with detailed information

2. **Execution Results**
   - Success/error status
   - Number of rooms affected
   - Execution timestamp
   - Trigger source

3. **Recent Execution Log**
   - Last 10 executions (automatic + manual)
   - Timestamp and rooms affected
   - Badge indicating trigger source
   - Refresh button to reload logs

### Usage

1. Navigate to "Admin Testing" in the sidebar
2. Click "Trigger Manual Reset" button
3. Wait for execution (typically < 1 second)
4. View results in the success alert
5. Check the execution log for history

## Testing

### Manual Testing via UI

1. **Create Test Data:**
   ```sql
   -- Create a reservation for yesterday
   INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status)
   VALUES (1, 1, CURRENT_DATE - 1, CURRENT_DATE + 1, 'checked-in');

   -- Mark room as clean
   UPDATE rooms SET is_cleaned = true WHERE id = 1;
   ```

2. **Trigger Reset:**
   - Go to `/admin/testing`
   - Click "Trigger Manual Reset"
   - Verify room is marked as dirty

3. **Verify Results:**
   ```sql
   SELECT id, room_number, is_cleaned FROM rooms WHERE id = 1;
   -- Should show is_cleaned = false

   SELECT * FROM room_cleaning_reset_log ORDER BY executed_at DESC LIMIT 1;
   -- Should show rooms_reset = 1, triggered_by = 'manual'
   ```

### Testing Automatic Execution

**Option 1: Wait for scheduled time**
- Wait until 7:00 AM Europe/Zagreb
- Check logs after execution

**Option 2: Modify cron schedule temporarily**
```sql
-- Change to run every minute (for testing)
SELECT cron.unschedule('reset-daily-room-cleaning');
SELECT cron.schedule(
  'reset-daily-room-cleaning',
  '* * * * *',  -- Every minute
  $$SELECT reset_daily_room_cleaning('automatic');$$
);

-- After testing, restore original schedule
SELECT cron.unschedule('reset-daily-room-cleaning');
SELECT cron.schedule(
  'reset-daily-room-cleaning',
  '0 5 * * *',  -- 5:00 AM UTC
  $$SELECT reset_daily_room_cleaning('automatic');$$
);
```

## Monitoring

### Check pg_cron Status
```sql
SELECT * FROM cron.job WHERE jobname = 'reset-daily-room-cleaning';
```

### View Recent Executions
```sql
SELECT * FROM room_cleaning_reset_log
ORDER BY executed_at DESC
LIMIT 10;
```

### Check Failed Executions
```sql
-- pg_cron keeps logs of failures
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-room-cleaning')
ORDER BY start_time DESC
LIMIT 10;
```

### Monitor Room Status Changes
```sql
-- Rooms that were reset today
SELECT r.id, r.room_number, r.is_cleaned, r.updated_at
FROM rooms r
WHERE r.updated_at::DATE = CURRENT_DATE
  AND r.is_cleaned = false
ORDER BY r.updated_at DESC;
```

## Troubleshooting

### Issue: Function not executing automatically

**Check 1: Verify pg_cron is enabled**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Check 2: Verify job is scheduled**
```sql
SELECT * FROM cron.job WHERE jobname = 'reset-daily-room-cleaning';
```

**Check 3: Check for errors**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-room-cleaning')
  AND status = 'failed'
ORDER BY start_time DESC;
```

### Issue: Manual trigger fails with authentication error

**Solution:** Ensure user is logged in and session is valid.

```typescript
// Check session
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  // Redirect to login or refresh session
}
```

### Issue: No rooms are being reset

**Check 1: Verify there are occupied rooms**
```sql
SELECT COUNT(DISTINCT room_id)
FROM reservations
WHERE check_in_date <= (CURRENT_DATE - INTERVAL '1 day')
  AND check_out_date >= (CURRENT_DATE - INTERVAL '1 day')
  AND status NOT IN ('cancelled', 'no-show');
```

**Check 2: Verify function logic**
```sql
-- Dry run to see which rooms would be affected
WITH occupied_rooms AS (
  SELECT DISTINCT room_id
  FROM reservations
  WHERE check_in_date <= (CURRENT_DATE - INTERVAL '1 day')
    AND check_out_date >= (CURRENT_DATE - INTERVAL '1 day')
    AND status NOT IN ('cancelled', 'no-show')
)
SELECT r.id, r.room_number, r.is_cleaned
FROM rooms r
JOIN occupied_rooms o ON r.id = o.room_id;
```

## Future Enhancements

1. **Email Notifications**
   - Send email to housekeeping manager with daily room list
   - Include special notes or priorities

2. **Priority Rooms**
   - Flag VIP rooms or early check-ins
   - Adjust cleaning order based on priorities

3. **Mobile App Integration**
   - Push notifications to housekeeping staff
   - Real-time status updates via mobile app

4. **Analytics Dashboard**
   - Track cleaning completion times
   - Identify bottlenecks and optimize staffing

5. **Integration with NFC System**
   - Coordinate with existing NFC room cleaning system
   - Prevent double-cleaning or missed rooms

## Migration History

**Migration:** `20250827_create_daily_room_cleaning_reset_system`
**Applied:** 2025-08-27
**Status:** ✅ Deployed

## Related Documentation

- [NFC Room Cleaning System](../NFC_IMPLEMENTATION_COMPLETE.md)
- [Room Cleaning Service](../src/services/RoomCleaningService.ts)
- [Room Cleaning Indicator Component](../src/components/hotel/frontdesk/RoomCleaningIndicator.tsx)

---

**Last Updated:** August 27, 2025
**Version:** 1.0
**Author:** Hotel Inventory System Team
