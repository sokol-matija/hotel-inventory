# 🏷️ NFC Room Cleaning - Setup & Testing Checklist

## ✅ Created Files

All files have been created and are ready to use:

### Backend Files
- [x] `supabase/functions/nfc-clean-room/index.ts` - Edge Function
- [x] `src/services/RoomCleaningService.ts` - Service layer

### Frontend Files
- [x] `src/components/testing/NFCTestPage.tsx` - Test interface
- [x] `src/components/hotel/frontdesk/RoomCleaningIndicator.tsx` - Status indicator
- [x] `src/utils/nfcTest.ts` - Test utilities

### Tests & Documentation
- [x] `src/__tests__/integration/nfc-room-cleaning.integration.test.ts` - Integration tests
- [x] `docs/NFC_TESTING_GUIDE.md` - Complete guide
- [x] `docs/NFC_IMPLEMENTATION_SUMMARY.md` - Implementation overview

---

## 📋 Setup Steps

### Step 1: Add Test Route (5 minutes)

In your routing configuration (App.tsx or routes file):

```typescript
import { NFCTestPage } from '@/components/testing/NFCTestPage'

// Add this route:
<Route path="/test/nfc" element={<NFCTestPage />} />
```

**Verification:**
- [ ] Route added
- [ ] App compiles without errors

---

### Step 2: Test in Browser (10 minutes)

1. Start your dev server (already running)
2. Navigate to: `http://localhost:3000/test/nfc`
3. You should see:
   - [ ] List of rooms with status (✅ Clean / ❌ Dirty)
   - [ ] "Tap" buttons for each room
   - [ ] Test results display
   - [ ] NFC URIs to copy

**Run a test:**
1. [ ] Click "Tap" button for any room
2. [ ] Watch status change from ❌ Dirty to ✅ Clean
3. [ ] Check console for debug logs

**Expected result:**
```
✅ Room 101 marked as clean
```

---

### Step 3: Deploy Edge Function (5 minutes)

#### Option A: Using Supabase CLI (Recommended)

```bash
cd /Users/msokol/Dev/Repos/2-Personal/hotel-inventory

# Deploy the function
supabase functions deploy nfc-clean-room

# Check if deployed
supabase functions list

# View logs
supabase functions logs nfc-clean-room
```

**Verification:**
- [ ] Function deployed without errors
- [ ] `supabase functions list` shows `nfc-clean-room`
- [ ] No error messages in logs

#### Option B: Using Supabase Dashboard

1. Go to: https://app.supabase.com
2. Select project: `gkbpthurkucotikjefra` (hp-duga)
3. Go to: Edge Functions section
4. Upload `supabase/functions/nfc-clean-room/index.ts`
5. Click Deploy

**Verification:**
- [ ] Function appears in dashboard
- [ ] Status shows "Active"

---

### Step 4: Test Edge Function (10 minutes)

#### Test 1: Browser Simulator
From `/test/nfc` page:
- [ ] Click "Simulate NFC Tap"
- [ ] Should see success message
- [ ] Room status should update

#### Test 2: Using curl (Advanced)
```bash
# Replace room-101 with actual room ID from your database
curl "https://gkbpthurkucotikjefra.supabase.co/functions/v1/nfc-clean-room?roomId=room-101"

# Should return:
# {"success":true,"message":"Room 101 marked as clean",...}
```

**Verification:**
- [ ] curl returns `"success": true`
- [ ] Room status updates in database

---

### Step 5: Real-Time Subscriptions (5 minutes)

Test that changes broadcast in real-time:

1. [ ] Open `/test/nfc` in one browser tab
2. [ ] Open `/test/nfc` in another browser tab
3. [ ] Click "Tap" in Tab 1
4. [ ] Room should update in Tab 2 instantly

**Verification:**
- [ ] Status updates instantly across tabs
- [ ] No page refresh needed

---

## 🧪 Testing Scenarios

### Scenario 1: Single Room Tap
```
Given: Room 101 is dirty
When: NFC tag is tapped
Then: Room 101 is marked clean instantly
```
- [ ] Works in browser simulator
- [ ] Works with curl

### Scenario 2: Multiple Rooms
```
Given: 10 rooms need cleaning
When: "Batch Test" button clicked
Then: All rooms are marked clean
```
- [ ] Batch test button works
- [ ] All rooms update

### Scenario 3: Real-Time Updates
```
Given: Two browser tabs with same page
When: User taps in Tab 1
Then: Status updates in Tab 2 instantly
```
- [ ] Real-time subscription works
- [ ] No polling needed

### Scenario 4: Error Handling
```
Given: Invalid room ID
When: NFC tap simulated
Then: Error message shown
```
- [ ] Edge Function returns error
- [ ] App handles gracefully

---

## 📱 Physical NFC Tag Setup (Optional - For Production)

### Required Hardware
- [ ] Blank NFC tags (NTAG213/215) - ~$20 for 46
- [ ] Smartphone with NFC capability
- [ ] NFC Tools app installed

### Step 1: Order NFC Tags
- Visit: Amazon, AliExpress, or local electronics store
- Search: "NTAG213 NFC tags" or "NTAG215"
- Buy: Pack of 50 (enough for 46 rooms)

### Step 2: Get NFC Tools App
- [ ] iOS: https://apps.apple.com/us/app/nfc-tools/id1252070271
- [ ] Android: https://play.google.com/store/apps/details?id=com.wakdev.wrnfctools

### Step 3: Get NFC URIs
1. Go to: `http://localhost:3000/test/nfc`
2. Click "Copy" button next to each room's URI
3. Save to text file

**Example URI:**
```
https://gkbpthurkucotikjefra.supabase.co/functions/v1/nfc-clean-room?roomId=abc123
```

### Step 4: Write to Physical Tag
1. [ ] Open NFC Tools app
2. [ ] Click "Write" tab
3. [ ] Click "Add a record"
4. [ ] Select "URI" type
5. [ ] Paste NFC URI
6. [ ] Hold blank NFC tag to phone back
7. [ ] Confirm write

### Step 5: Test Physical Tag
1. [ ] Hold NFC tag near phone
2. [ ] Browser should open automatically
3. [ ] Should see success message
4. [ ] Room status updates in app

### Step 6: Deploy to Hotel
1. [ ] Stick NFC tag on room door (near handle)
2. [ ] Train staff on how to use
3. [ ] Test with real staff

---

## 🔧 Integration with Your App

### Add Indicator to Hotel Timeline
In your room card/timeline component:

```typescript
import { RoomCleaningIndicator } from '@/components/hotel/frontdesk/RoomCleaningIndicator'

export const RoomCard = ({ roomId, roomNumber }) => {
  return (
    <div className="room-card">
      <h3>Room {roomNumber}</h3>
      <RoomCleaningIndicator roomId={roomId} />
    </div>
  )
}
```

### Hook into Checkout Flow
When guest checks out:

```typescript
import { RoomCleaningService } from '@/services/RoomCleaningService'

async function handleCheckout(reservationId: string, roomId: string) {
  // ... existing checkout logic

  // Mark room as dirty for cleaning
  const service = RoomCleaningService.getInstance()
  await service.markRoomAsDirty(roomId)

  console.log(`Room ${roomId} ready for cleaning`)
}
```

### Manual Override (Optional)
Allow staff to mark room clean without NFC:

```typescript
async function markRoomClean(roomId: string) {
  const service = RoomCleaningService.getInstance()
  await service.markRoomAsClean(roomId)
}
```

---

## ✅ Validation Checklist

### Code Quality
- [ ] No TypeScript errors
- [ ] All imports resolve
- [ ] Services follow patterns
- [ ] Components render without warnings

### Functionality
- [ ] Edge Function deployed
- [ ] NFC taps work in browser
- [ ] Real-time subscriptions work
- [ ] Error handling works
- [ ] Database updates correctly

### Performance
- [ ] Response time < 1 second
- [ ] Real-time updates < 2 seconds
- [ ] Handle multiple concurrent taps
- [ ] No database connection leaks

### Documentation
- [ ] Setup guide complete
- [ ] Testing guide available
- [ ] Code examples provided
- [ ] Troubleshooting section present

---

## 🚀 Go-Live Checklist

Before deploying to production:

- [ ] Edge Function tested and working
- [ ] All browser tests passing
- [ ] Real-time subscriptions tested
- [ ] Error handling tested
- [ ] Staff trained on NFC tags
- [ ] Physical NFC tags written and tested
- [ ] Indicators integrated into UI
- [ ] Checkout flow hooks integrated
- [ ] Monitoring/logging set up
- [ ] Backup manual marking option available

---

## 📊 Success Metrics

- ✅ Rooms can be marked clean with NFC tap
- ✅ Status updates instantly
- ✅ No authentication required
- ✅ Works offline (once tag is written)
- ✅ Staff can use without training
- ✅ No database errors

---

## 🆘 Troubleshooting

### Browser test not working
1. Check: Is Edge Function deployed?
   ```bash
   supabase functions list | grep nfc-clean-room
   ```
2. Check: Are there console errors? Open Dev Tools → Console
3. Check: Is `/test/nfc` route added to App?

### Edge Function not found
1. Deploy: `supabase functions deploy nfc-clean-room`
2. Wait: 30 seconds for deployment
3. Check: `supabase functions logs nfc-clean-room`

### Real-time updates not working
1. Check: Is subscription code correct?
2. Check: Database has `is_cleaned` column?
3. Check: Supabase project has real-time enabled?

### Physical NFC tag not working
1. Check: NFC Tools app wrote correctly
2. Check: Phone has NFC capability
3. Check: Tag is held close enough to phone
4. Check: URI is correct (copy from test page)

---

## 📞 Support

**For questions or issues:**
1. Check: `docs/NFC_TESTING_GUIDE.md`
2. Check: Console logs for errors
3. Check: Supabase dashboard for function logs
4. Check: Database browser to verify updates

---

## Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Add test route | 5 min | ⏳ TODO |
| 2 | Test in browser | 10 min | ⏳ TODO |
| 3 | Deploy Edge Function | 5 min | ⏳ TODO |
| 4 | Test Edge Function | 10 min | ⏳ TODO |
| 5 | Test real-time | 5 min | ⏳ TODO |
| 6 | Setup physical tags | 1-2 hrs | ⏳ OPTIONAL |
| 7 | Integrate to app | 30 min | ⏳ TODO |
| 8 | Go live | 1 day | ⏳ FUTURE |

**Total time to working system: ~35 minutes**

---

**Created:** October 26, 2025
**Status:** Ready for setup
**Complexity:** 🟢 Low
**Risk Level:** 🟢 Low (no database schema changes)

Let me know when you're ready to start testing! 🚀
