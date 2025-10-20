# Email Template - Image Setup Guide

## 🖼️ Setting Up Images for Email Template

The email template now matches your login screen design and includes the Hotel Porec logo. However, **email clients require absolute URLs** for images. You need to host your logo online.

---

## Quick Setup Options

### **Option 1: Use Supabase Storage (Recommended)**

Upload your logo to Supabase Storage and get a public URL.

#### Steps:

1. **Go to Supabase Dashboard**
   ```
   Your Project → Storage → Create new bucket
   ```

2. **Create a Public Bucket**
   ```
   Bucket name: email-assets
   Public: ✓ Yes
   ```

3. **Upload Logo**
   ```
   Upload file: /public/LOGO1-hires.png
   ```

4. **Get Public URL**
   ```
   Right-click on uploaded file → Copy URL
   Example: https://xxxxx.supabase.co/storage/v1/object/public/email-assets/LOGO1-hires.png
   ```

5. **Update Email Template**
   Replace line 34 in `supabase-email-template.html`:
   ```html
   <!-- FROM: -->
   <img src="https://your-domain.com/LOGO1-hires.png"

   <!-- TO: -->
   <img src="https://xxxxx.supabase.co/storage/v1/object/public/email-assets/LOGO1-hires.png"
   ```

---

### **Option 2: Use Your Production Domain**

If you have a production domain deployed:

1. **Deploy your app** with the logo in `/public` folder

2. **Update Email Template**
   ```html
   <img src="https://your-production-domain.com/LOGO1-hires.png"
   ```

---

### **Option 3: Use a CDN (ImgBB, Cloudinary, etc.)**

1. **Upload to ImgBB** (free option)
   - Go to: https://imgbb.com
   - Upload `/public/LOGO1-hires.png`
   - Copy the direct link

2. **Update Email Template**
   ```html
   <img src="https://i.ibb.co/xxxxx/LOGO1-hires.png"
   ```

---

## Optional: Background Image

The mozaik background image is included but won't show in all email clients. It's primarily for Outlook users.

If you want to enable it:

1. **Upload `/public/mozaik_gp1.png`** to Supabase Storage (same steps as logo)

2. **Update line 22** in template:
   ```html
   <!-- FROM: -->
   src="https://your-cdn-url.com/mozaik_gp1.png"

   <!-- TO: -->
   src="https://xxxxx.supabase.co/storage/v1/object/public/email-assets/mozaik_gp1.png"
   ```

**Note:** Most modern email clients (Gmail, Apple Mail) won't show background images for security reasons. The gradient background will still display.

---

## Complete Setup Checklist

### Step 1: Upload Logo to Supabase Storage

```bash
# Using Supabase Dashboard:
1. Storage → Create bucket "email-assets" (public)
2. Upload /public/LOGO1-hires.png
3. Copy public URL
```

### Step 2: Update Email Template

Replace this line (34):
```html
<img src="https://your-domain.com/LOGO1-hires.png"
```

With your actual URL:
```html
<img src="https://xxxxx.supabase.co/storage/v1/object/public/email-assets/LOGO1-hires.png"
```

### Step 3: Upload to Supabase Email Templates

1. Go to: **Supabase Dashboard → Authentication → Email Templates**
2. Select: **"Confirm signup"**
3. Paste the updated HTML
4. Click **"Save"**

### Step 4: Test

1. Create a new test account
2. Check your email
3. You should see:
   - ✅ Hotel Porec logo
   - ✅ Blue-purple gradient background
   - ✅ White card (matching login screen)
   - ✅ Same button styling

---

## Design Elements Matching Login Screen

| Element | Login Screen | Email Template |
|---------|-------------|----------------|
| **Background** | Blue-indigo gradient | ✅ Same gradient |
| **Background Image** | mozaik_gp1.png @ 40% | ⚠️ Outlook only |
| **Logo** | LOGO1-hires.png | ✅ Same logo |
| **Card** | White with backdrop blur | ✅ White card with shadow |
| **Button** | Blue-purple gradient | ✅ Same gradient |
| **Typography** | System fonts | ✅ Same fonts |
| **Colors** | Tailwind palette | ✅ Same colors |
| **Footer Text** | "Made by Matija..." | ✅ Included |

---

## Email Client Compatibility

### ✅ **Will Show Logo:**
- Gmail (Web & Mobile)
- Apple Mail (Mac & iOS)
- Outlook (Web & Desktop)
- Yahoo Mail
- ProtonMail
- All major clients

### ⚠️ **Background Image Limited:**
- **Outlook Desktop**: ✅ Will show
- **Gmail**: ❌ Security blocks background images
- **Apple Mail**: ❌ Might not show
- **Others**: ❌ Gradient fallback only

**Recommendation:** Don't worry about background image. The gradient looks great on its own!

---

## Troubleshooting

### **Logo doesn't show?**

1. **Check URL is public**
   - Try opening the URL in incognito browser
   - Should load without authentication

2. **Check Supabase bucket is public**
   - Storage → Your bucket → Settings
   - Public: should be ✓ Yes

3. **Check image dimensions**
   - Email shows it at 192x128px
   - Original can be larger, will scale down

### **Email looks different than login screen?**

Email clients have limitations:
- ❌ No CSS backdrop-blur (email doesn't support it)
- ❌ No background images in most clients
- ✅ Gradients work everywhere
- ✅ Logo works everywhere
- ✅ Button styling works everywhere

The email will match the **aesthetic** and **colors** but can't be pixel-perfect due to email client limitations.

---

## Quick Reference

### Supabase Storage URL Format:
```
https://[PROJECT-REF].supabase.co/storage/v1/object/public/[BUCKET]/[FILE]
```

### Example:
```
https://abcdefghijklm.supabase.co/storage/v1/object/public/email-assets/LOGO1-hires.png
```

### Find Your Project Ref:
1. Supabase Dashboard → Settings → API
2. Look for "Project URL"
3. Extract the project ref (part before .supabase.co)

---

## Alternative: Inline Image (Not Recommended)

You can embed the image as base64, but this:
- Makes email file huge
- Can trigger spam filters
- Not recommended for production

If you must use it temporarily:

```bash
# Convert image to base64
base64 /public/LOGO1-hires.png
```

Then use:
```html
<img src="data:image/png;base64,[paste base64 here]"
```

⚠️ **Use actual hosted URL instead!**

---

## Summary

1. ✅ Upload `LOGO1-hires.png` to Supabase Storage
2. ✅ Make bucket public
3. ✅ Copy public URL
4. ✅ Update line 34 in email template
5. ✅ Save in Supabase Email Templates
6. ✅ Test with new account

**Result:** Beautiful email matching your login screen! 🎨

---

**Created:** October 20, 2025
**Version:** 3.0 (Login Screen Match)
