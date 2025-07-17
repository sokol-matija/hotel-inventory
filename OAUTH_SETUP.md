# OAuth Setup Instructions

## Overview
To fix the OAuth redirect URLs for production deployment, you need to update the configuration in both Supabase and Google Console.

## Current Issue
The Google OAuth redirect URL is currently set to `http://localhost:3000/dashboard` but needs to support both development and production environments.

## Production URL
- **Development**: `http://localhost:3000/dashboard`
- **Production**: `https://hotel-porec.vercel.app/dashboard`

## Steps to Fix

### 1. Update Supabase Configuration

1. Go to your Supabase Dashboard: https://app.supabase.com/project/gkbpthurkucotikjefra
2. Navigate to **Authentication** > **Settings**
3. In the **Site URL** section, add:
   - Site URL: `https://hotel-porec.vercel.app`
4. In the **Redirect URLs** section, add both:
   - `http://localhost:3000/dashboard`
   - `https://hotel-porec.vercel.app/dashboard`

### 2. Update Google Console Configuration

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to **APIs & Services** > **Credentials**
3. Find your OAuth 2.0 client ID (Client ID: `768745734529-kov6qgakph49168jkipibpqi6psjnk3e.apps.googleusercontent.com`)
4. Click Edit
5. In **Authorized redirect URIs**, add:
   - `https://gkbpthurkucotikjefra.supabase.co/auth/v1/callback`
6. In **Authorized JavaScript origins**, add:
   - `https://hotel-porec.vercel.app`
   - `http://localhost:3000` (if not already present)

### 3. Code Changes Made

The code has already been updated to automatically use the correct redirect URL based on the current environment:

```typescript
const redirectUrl = `${window.location.origin}/dashboard`
```

This will automatically resolve to:
- Development: `http://localhost:3000/dashboard`
- Production: `https://hotel-porec.vercel.app/dashboard`

### 4. Test the Configuration

1. Deploy your changes to production
2. Visit `https://hotel-porec.vercel.app/login`
3. Click "Continue with Google"
4. Verify it redirects correctly to `https://hotel-porec.vercel.app/dashboard` after authentication

## Important Notes

- The Supabase callback URL should remain: `https://gkbpthurkucotikjefra.supabase.co/auth/v1/callback`
- Make sure both development and production URLs are added to avoid issues during development
- The Google OAuth client should be configured for both domains

## Troubleshooting

If you still encounter issues:

1. Check that all URLs are correctly added to both Supabase and Google Console
2. Ensure there are no trailing slashes in the URLs
3. Wait a few minutes for changes to propagate
4. Clear browser cache and cookies
5. Check the browser's developer console for any error messages

## Security Considerations

- Only add trusted domains to the OAuth configuration
- Regularly review and update the allowed redirect URLs
- Consider using environment variables for configuration in larger deployments