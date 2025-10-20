# Supabase Quick Setup Guide - Hotel Porec

## 🚀 Quick Setup Checklist

Follow these steps to configure Supabase for the Hotel Porec staff management system.

---

## ✅ Step 1: Configure Redirect URLs

**Location:** Supabase Dashboard → Authentication → URL Configuration

### **Add these Redirect URLs:**

```
http://localhost:3000/onboarding
http://localhost:3000/hotel/module-selector
https://your-production-domain.com/onboarding
https://your-production-domain.com/hotel/module-selector
```

### **Set Site URL:**

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://your-production-domain.com
```

### **Why this matters:**
- After email confirmation, users are redirected to `/onboarding`
- This is where they select their role (reception, kitchen, admin, etc.)
- Without this configuration, the redirect will fail

---

## ✅ Step 2: Update Email Template (Optional but Recommended)

**Location:** Supabase Dashboard → Authentication → Email Templates → Confirm signup

1. Copy the HTML from: `docs/supabase-email-template.html`
2. Paste into the Supabase email template editor
3. Click **Save**

**Result:** Users will receive a professional, branded Hotel Porec email instead of the default Supabase template.

---

## ✅ Step 3: Verify Database Tables

Make sure these tables exist:

- `user_roles` - Contains role definitions (admin, reception, kitchen, etc.)
- `user_profiles` - Links users to their selected roles

### **Check if tables exist:**

Run this query in Supabase SQL Editor:

```sql
-- Check if user_roles table exists
SELECT * FROM user_roles;

-- Check if user_profiles table exists
SELECT * FROM user_profiles;
```

### **If tables don't exist:**

You may need to run migrations or create them manually. The tables should have been created by your migration scripts.

---

## ✅ Step 4: Verify User Roles Data

Make sure the `user_roles` table has the required roles:

```sql
SELECT * FROM user_roles ORDER BY name;
```

**Expected roles:**
- admin
- reception
- kitchen
- housekeeping
- bookkeeping

### **If roles are missing:**

Insert them manually:

```sql
INSERT INTO user_roles (name, description) VALUES
  ('admin', 'System administrator with full access'),
  ('reception', 'Front desk staff'),
  ('kitchen', 'Kitchen staff'),
  ('housekeeping', 'Housekeeping staff'),
  ('bookkeeping', 'Finance and accounting staff')
ON CONFLICT (name) DO NOTHING;
```

---

## ✅ Step 5: Test the Complete Flow

### **Test Signup:**

1. Go to: `http://localhost:3000/login`
2. Click "Don't have an account? Sign up"
3. Enter email and password
4. Check "I agree to Terms of Service"
5. Click "Create Account"
6. **Expected:** Beautiful confirmation modal appears

### **Test Email Confirmation:**

1. Check your email inbox
2. **Expected:** Professional Hotel Porec branded email
3. Click "Confirm Your Email" button
4. **Expected:** Redirected to `http://localhost:3000/onboarding`
5. **Expected:** Role selection screen appears

### **Test Role Selection:**

1. Select a role (e.g., "Reception")
2. Click "Continue to Dashboard"
3. **Expected:** Profile created in `user_profiles` table
4. **Expected:** Redirected to Module Selector

### **Test Admin Role:**

1. Create a new account
2. Confirm email
3. On role selection screen, click "Admin"
4. **Expected:** Password input appears
5. Enter: `Hp247@$&`
6. Click "Continue to Dashboard"
7. **Expected:** Admin profile created
8. **Expected:** User sees all modules

### **Test Existing User:**

1. Log out
2. Log back in with same credentials
3. **Expected:** Skip role selection
4. **Expected:** Go directly to Module Selector

---

## 🔧 Troubleshooting

### **Problem: Email confirmation redirects to wrong URL**

**Solution:**
1. Check Supabase Dashboard → Authentication → URL Configuration
2. Verify `/onboarding` is in "Redirect URLs"
3. Make sure "Site URL" is set correctly

### **Problem: Role selection screen doesn't appear**

**Solution:**
1. Check browser console for errors
2. Verify `user_profiles` table exists
3. Check `RoleSelectionWrapper` component is working

### **Problem: Admin password doesn't work**

**Solution:**
1. Password must be exactly: `Hp247@$&`
2. Case-sensitive
3. Check `RoleSelection.tsx` line 93 for password check

### **Problem: User stuck in redirect loop**

**Solution:**
1. Clear browser cache and cookies
2. Check `AuthProvider.tsx` profile checking logic
3. Verify `hasProfile` state is working correctly

---

## 📋 Configuration Summary

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:3000` |
| **Redirect URLs** | `http://localhost:3000/onboarding`<br>`http://localhost:3000/hotel/module-selector` |
| **Email Template** | Custom Hotel Porec branded template |
| **Admin Password** | `Hp247@$&` |
| **Required Tables** | `user_roles`, `user_profiles` |

---

## 🎯 Expected User Flow

```
┌─────────────────┐
│   User Signup   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Sent     │
│  (Check inbox)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click Confirm   │
│   Link in       │
│     Email       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redirect to    │
│  /onboarding    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Role Selection  │
│  Screen Shows   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Selects   │
│   Role (or      │
│   Admin+Pass)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Profile Created │
│  in user_       │
│   profiles      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redirect to    │
│ Module Selector │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ User can access │
│  all modules    │
│  based on role  │
└─────────────────┘
```

---

## 🆘 Need Help?

If you encounter issues:

1. Check browser console for error messages
2. Check Supabase logs: Dashboard → Logs
3. Verify all configuration steps above
4. Check the detailed guide: `docs/EMAIL_TEMPLATE_SETUP.md`

---

**Last Updated:** October 20, 2025
**Version:** 1.0
**Contact:** Matija Sokol
