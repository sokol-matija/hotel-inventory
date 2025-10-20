# Hotel Porec - Project Information

## 🗂️ Supabase Configuration

### **Project Details**

**Project ID:** `gkbpthurkucotikjefra`

**Project URL:** `https://gkbpthurkucotikjefra.supabase.co`

**Database URL:** `db.gkbpthurkucotikjefra.supabase.co`

---

## 📦 Supabase Storage Buckets

### **email-assets** (Public)
Storage for email template assets.

**Files:**
- `LOGO1-hires.png` - Hotel Porec logo
- `mozaik_gp1 copy-2.png` - Mozaik background image

**Public URLs:**
```
Logo: https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/email-assets/LOGO1-hires.png

Background: https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/email-assets/mozaik_gp1%20copy-2.png
```

### **hotel-assets** (Public)
Legacy storage bucket for hotel assets.

**Files:**
- `LOGO1-hires.png`
- `mozaik_gp1_copy.png`

---

## 🔑 Environment Variables

### **Development (.env.local)**
```bash
REACT_APP_SUPABASE_URL=https://gkbpthurkucotikjefra.supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
REACT_APP_FISCAL_FORCE_TEST=true
```

### **Production**
```bash
REACT_APP_SUPABASE_URL=https://gkbpthurkucotikjefra.supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
REACT_APP_FISCAL_FORCE_TEST=false
```

---

## 📧 Email Template Configuration

### **Confirmation Email**

**Location:** Supabase Dashboard → Authentication → Email Templates → "Confirm signup"

**Template File:** `docs/supabase-email-template.html`

**Images Used:**
- Logo: From `email-assets` bucket
- Background: From `email-assets` bucket (Outlook only)

**Redirect URL:** `http://localhost:3000/onboarding` (dev)

---

## 🔐 Authentication Configuration

### **Allowed Redirect URLs**
```
http://localhost:3000/onboarding
http://localhost:3000/hotel/module-selector
https://your-production-domain.com/onboarding
https://your-production-domain.com/hotel/module-selector
```

### **Site URL**
```
Development: http://localhost:3000
Production: https://your-production-domain.com
```

---

## 🗄️ Database Tables

### **Authentication & Users**
- `user_roles` - Role definitions (admin, reception, kitchen, housekeeping, bookkeeping)
- `user_profiles` - User role assignments

### **Hotel Management**
- `hotels`
- `rooms`
- `room_types`
- `guests`
- `reservations`
- `reservation_guests` (junction table)

### **Finance**
- `invoices`
- `invoice_items`
- `fiscal_responses`

---

## ⚙️ Edge Functions

### **fiscalize-invoice**
**URL:** `https://gkbpthurkucotikjefra.supabase.co/functions/v1/fiscalize-invoice`

**Purpose:** Croatian fiscal e-invoice generation

### **send-email**
**URL:** `https://gkbpthurkucotikjefra.supabase.co/functions/v1/send-email`

**Purpose:** Email sending service

### **daily-notifications**
**URL:** `https://gkbpthurkucotikjefra.supabase.co/functions/v1/daily-notifications`

**Purpose:** Daily notification cron job

### **phobs-webhook**
**URL:** `https://gkbpthurkucotikjefra.supabase.co/functions/v1/phobs-webhook`

**Purpose:** Phobs Channel Manager webhook handler

---

## 🎨 Branding Assets

### **Logo**
- **File:** `LOGO1-hires.png`
- **Dimensions:** 192x128px (display size)
- **Format:** PNG with transparency
- **Location:** `/public/LOGO1-hires.png`

### **Background Images**
- `mozaik_gp1.png` - Login screen background
- `mozaik_gp1 copy-2.png` - Email template background
- `zemlja_gp_copy.png` - Module selector background

### **Color Palette**
- **Primary Gradient:** Blue (`#2563eb`) → Purple (`#7c3aed`)
- **Background Gradient:** Blue-50 (`#eff6ff`) → Indigo-100 (`#e0e7ff`)
- **Success Green:** `#22c55e` → `#16a34a`
- **Warning Amber:** `#fef3c7` background, `#f59e0b` border

---

## 🚀 Deployment

### **Current Status**
- Development: `localhost:3000`
- Production: Not yet deployed

### **Recommended Deployment**
- **Platform:** Vercel / Netlify
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Environment Variables:** Set in platform dashboard

---

## 📝 Key Features

### **Implemented**
- ✅ User authentication (email/password + Google OAuth)
- ✅ Role-based access control (5 roles)
- ✅ Admin password protection (`Hp247@$&`)
- ✅ Email confirmation with custom branded template
- ✅ Role selection on first login
- ✅ Module-based navigation
- ✅ Croatian fiscal integration
- ✅ Phobs Channel Manager integration
- ✅ Multi-language support (EN, DE, HR, IT)

### **Current Development**
- Email template matching login screen design
- Terms of Service integration
- Enhanced user onboarding flow

---

## 🔧 Development

### **Local Development**
```bash
npm start
# Runs on http://localhost:3000
```

### **Build**
```bash
npm run build
# Creates production build in /build
```

### **Test**
```bash
npm test
# Runs test suite
```

---

## 📞 Contact Information

**Hotel Porec**
- Address: 52440 Poreč, Croatia
- Phone: +385(0)52/451 611
- Email: hotelporec@pu.t-com.hr
- Website: www.hotelporec.com

**Developer**
- Name: Matija Sokol
- Client: Mara

---

**Last Updated:** October 20, 2025
**Version:** 1.0
