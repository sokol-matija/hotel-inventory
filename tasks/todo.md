# iOS App Switching - Infinite Loading Bug Fix

## Problem
After switching apps on iPhone and returning to the web app, actions like adding new articles result in infinite loading.

## Root Causes Identified
1. **Supabase Session Timeout**: iOS Safari suspends network requests when apps are backgrounded
2. **Service Worker Issues**: SW intercepts requests but doesn't handle background/foreground transitions
3. **Missing App Lifecycle Events**: No handling for visibility changes or app focus/blur
4. **Auth State Not Refreshed**: Session may expire while app is in background

## Tasks

### [ ] 1. Add App Lifecycle Event Handlers
- Add visibilitychange event listener to detect when app becomes visible again
- Add focus/blur event listeners for additional app state tracking
- Refresh Supabase session when app becomes active again

### [ ] 2. Fix AuthProvider Session Handling  
- Add session refresh logic when app regains focus
- Implement retry mechanism for failed auth requests
- Add timeout handling for suspended network requests

### [ ] 3. Update Service Worker
- Improve fetch event handling for background/foreground transitions
- Add proper error handling and retry logic for network requests
- Consider bypassing SW for critical auth requests

### [ ] 4. Add Request Retry Logic
- Implement automatic retry for failed API requests after app switching
- Add exponential backoff for network request failures
- Reset loading states properly when requests fail

### [ ] 5. Test and Validate
- Test app switching scenarios on iOS Safari
- Verify auth session persistence across app switching
- Test add article functionality after app switching

## Implementation Priority
1. High: App lifecycle event handlers (most likely fix)
2. High: AuthProvider session refresh 
3. Medium: Service Worker improvements
4. Medium: Request retry logic
5. Low: Additional testing and validation

## Review Section

### Implementation Completed
✅ **Added iOS Safari session refresh fix** to `AuthProvider.tsx`:
- Added `refreshSessionOnFocus` function that refreshes Supabase session when app becomes active
- Implemented multiple event listeners (`visibilitychange`, `pageshow`, `focus`) for better iOS Safari coverage
- Only refreshes session when user is authenticated and document is visible
- Added proper cleanup of event listeners

### Changes Made
- Modified `src/components/auth/AuthProvider.tsx:78-158`
- Added session refresh logic based on Supabase community best practices
- Used multiple event listeners to handle iOS Safari's inconsistent event firing

### Expected Result
- No more infinite loading when adding articles after app switching on iOS Safari
- Session automatically refreshes when user returns to app
- Works across different iOS Safari versions and scenarios

### Next Steps
- Test on iOS Safari by switching apps and trying to add articles
- Monitor console logs for "App became active, refreshing session..." messages