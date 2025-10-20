# Supabase Email Template Customization Guide

## Overview
This guide explains how to customize the Supabase email confirmation template for Hotel Porec staff management system.

---

## 📧 How to Customize Email Templates in Supabase

### **STEP 1: Configure Redirect URLs (IMPORTANT!)**

Before customizing the email template, you must configure the allowed redirect URLs:

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Configure Authentication URLs**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"URL Configuration"**
   - Add these URLs to **"Redirect URLs"**:
     ```
     http://localhost:3000/onboarding
     https://your-production-domain.com/onboarding
     ```
   - Set **"Site URL"** to:
     ```
     http://localhost:3000
     ```
     (or your production URL)
   - Click **"Save"**

### **STEP 2: Customize Email Template**

1. **Navigate to Email Templates**
   - Still in **"Authentication"** section
   - Click on **"Email Templates"**
   - Select **"Confirm signup"** template

2. **Update the Template**
   - Copy the contents from `docs/supabase-email-template.html`
   - Paste into the template editor
   - Click **"Save"**

3. **Test the Template**
   - Create a new account from your app
   - Check the email received
   - Click the confirmation link
   - **Should redirect to `/onboarding` to select role**
   - Verify the styling and links work correctly

---

### **Method 2: Using Supabase CLI**

```bash
# Update email template using CLI
supabase functions deploy
```

---

## 🎨 Email Template Features

The custom Hotel Porec email template includes:

✅ **Hotel Porec Branding**
- Blue-to-purple gradient matching app theme
- Hotel name and tagline
- Professional layout

✅ **Clear Call-to-Action**
- Large "Confirm Your Email" button
- Alternative text link for accessibility
- 24-hour expiration notice

✅ **Hotel Contact Information**
- Address: 52440 Poreč, Croatia
- Phone: +385(0)52/451 611
- Email: hotelporec@pu.t-com.hr
- Website: www.hotelporec.com

✅ **Security Notice**
- Expiration warning
- Instructions if user didn't sign up

---

## 🔧 Template Variables

The template uses these Supabase variables (automatically replaced):

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The unique confirmation link for the user |
| `{{ .Email }}` | The user's email address (optional) |
| `{{ .Token }}` | The confirmation token (optional) |
| `{{ .TokenHash }}` | Hashed token (optional) |

---

## 📝 Customization Options

### **Update Hotel Information**

Find and update these sections in the template:

```html
<!-- Hotel Name -->
<h1 style="...">Hotel Porec</h1>

<!-- Contact Info -->
<p style="...">52440 Poreč, Croatia</p>
<p style="...">+385(0)52/451 611</p>
<a href="mailto:hotelporec@pu.t-com.hr">hotelporec@pu.t-com.hr</a>
```

### **Change Colors**

Update the gradient colors:

```html
<!-- Header Gradient -->
background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);

<!-- Button Gradient -->
background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
```

### **Add Hotel Logo**

Replace the text header with an image:

```html
<td style="...text-align: center;">
  <img src="https://your-cdn.com/hotel-porec-logo.png"
       alt="Hotel Porec Logo"
       width="200"
       style="display: block; margin: 0 auto;" />
</td>
```

---

## 🧪 Testing the Email Template

### **Test Signup Flow:**

1. Create a new test account:
   ```
   Email: test@hotelporec.com
   Password: TestPassword123!
   ```

2. Check your email inbox

3. Verify the email looks professional:
   - ✅ Hotel branding displayed correctly
   - ✅ Confirmation button works
   - ✅ Alternative link provided
   - ✅ Contact information visible
   - ✅ Mobile-responsive design

---

## 🔒 Email Template Best Practices

### **Security:**
- ✅ Always use `{{ .ConfirmationURL }}` variable
- ✅ Don't hardcode confirmation links
- ✅ Include expiration warning
- ✅ Mention what to do if user didn't sign up

### **Accessibility:**
- ✅ Include plain text link as fallback
- ✅ Use semantic HTML
- ✅ Ensure good color contrast
- ✅ Test on multiple email clients

### **Deliverability:**
- ✅ Keep under 100KB
- ✅ Use inline CSS (no external stylesheets)
- ✅ Test on Gmail, Outlook, Apple Mail
- ✅ Avoid spam trigger words

---

## 📱 Mobile Responsiveness

The template is mobile-responsive:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<table width="600" style="max-width: 600px;">
```

This ensures:
- Desktop: 600px wide
- Mobile: Full width, scales down

---

## 🚀 Other Email Templates to Customize

After setting up the confirmation email, also customize:

1. **Password Reset Email**
   - Path: Authentication → Email Templates → Reset password
   - Use similar branding

2. **Magic Link Email** (if using passwordless login)
   - Path: Authentication → Email Templates → Magic link
   - Use similar branding

3. **Invite Email** (if inviting staff members)
   - Path: Authentication → Email Templates → Invite user
   - Use similar branding

---

## ⚙️ SMTP Configuration (Optional)

For custom email sending (instead of Supabase's default):

1. **Go to Project Settings**
   - Settings → Authentication → SMTP Settings

2. **Configure SMTP**
   ```
   Host: smtp.your-provider.com
   Port: 587
   Username: your-email@hotelporec.com
   Password: your-smtp-password
   Sender Email: noreply@hotelporec.com
   Sender Name: Hotel Porec
   ```

3. **Test SMTP**
   - Send test email
   - Verify delivery

---

## 📋 Checklist

Before going live:

- [ ] Email template updated in Supabase Dashboard
- [ ] Test signup with real email address
- [ ] Confirmation link works correctly
- [ ] Email looks good on desktop
- [ ] Email looks good on mobile
- [ ] Email looks good in Gmail
- [ ] Email looks good in Outlook
- [ ] Hotel contact information is correct
- [ ] Links point to correct URLs
- [ ] Branding matches app theme

---

## 🆘 Troubleshooting

### **Email not received?**
1. Check spam folder
2. Verify email provider settings
3. Check Supabase email rate limits
4. Verify SMTP configuration (if using custom SMTP)

### **Styling not showing?**
1. Use inline CSS only (no `<style>` tags)
2. Test in different email clients
3. Avoid external resources

### **Confirmation link broken?**
1. Ensure using `{{ .ConfirmationURL }}` variable
2. Check redirect URL in app
3. Verify site URL in Supabase settings

---

## 📚 Additional Resources

- [Supabase Email Templates Documentation](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Design Best Practices](https://www.campaignmonitor.com/dev-resources/)
- [HTML Email Testing Tools](https://www.emailonacid.com/)

---

**Last Updated:** October 20, 2025
**Version:** 1.0
**Contact:** Matija Sokol
