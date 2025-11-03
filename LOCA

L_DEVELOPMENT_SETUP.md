# Local Development Setup with Supabase

This guide will help you set up your local development environment with all the seed data from production.

## ✅ Prerequisites

- Docker Desktop installed and running
- Supabase CLI installed (`supabase --version` should work)
- Node.js and npm installed

## 🚀 Quick Setup (Run These Commands)

### Step 1: Initialize Supabase (if not done)

```bash
# This creates supabase/config.toml
supabase init
```

### Step 2: Disable Email Confirmations for Local Dev

Edit `supabase/config.toml` and change this setting:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false  # ← Change this from true to false
```

This allows instant registration without needing email verification locally.

### Step 3: Start Local Supabase

```bash
supabase start
```

This will:
- Start Docker containers for Postgres, Auth, Storage, etc.
- Apply all migrations (baseline + seed data)
- Give you access URLs

### Step 4: Verify Seed Data Was Loaded

```bash
# Check that tables have data
supabase db dump --data-only --local --table user_roles
```

You should see 5 roles (reception, kitchen, housekeeping, bookkeeping, admin).

### Step 5: Create a Test Admin User

Run this SQL in Studio (http://127.0.0.1:54323):

```sql
-- Create test admin user (password: admin123)
-- Note: In production, Supabase Auth handles this automatically
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.local',
  crypt('admin123', gen_salt('bf')),  -- Password: admin123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- Get the user ID from above and create user profile
-- Replace YOUR_USER_ID with the UUID returned above
INSERT INTO user_profiles (user_id, role_id, is_active)
VALUES ('YOUR_USER_ID', 5, true);  -- role_id 5 = admin
```

**Or use this simpler approach via Supabase Studio:**

1. Go to http://127.0.0.1:54323
2. Navigate to Authentication → Users
3. Click "Add user"
4. Email: `admin@test.local`
5. Password: `admin123`
6. Click "Create user"
7. Copy the user's UUID
8. Go to Table Editor → user_profiles
9. Insert new row with: user_id = (UUID from step 7), role_id = 5, is_active = true

### Step 6: Run Your App with Local Supabase

```bash
npm run local
```

Your app will now connect to http://127.0.0.1:54321 instead of production!

---

## 📊 What Data Is Available Locally?

After setup, your local database will have:

### ✅ Reference Data (Seed Data)
- **user_roles**: 5 roles (reception, kitchen, housekeeping, bookkeeping, admin)
- **room_types**: 5 types (single, double, triple, family, apartment)
- **booking_sources**: 5 sources (direct, booking.com, airbnb, expedia, walk-in)
- **reservation_statuses**: 6 statuses (confirmed, checked-in, checked-out, cancelled, no-show, pending)
- **categories**: 8 inventory categories
- **locations**: 4 storage locations
- **pricing_tiers**: 5 pricing tiers

### ✅ Hotel Configuration
- **hotels**: 1 hotel (Hotel Porec)
- **rooms**: 55 rooms across 4 floors

### ❌ NOT Included (Start Fresh)
- **No production guests** - Create test guests as needed
- **No production reservations** - Create test reservations
- **No production invoices** - Generate test invoices
- **No user accounts** - Create test users manually

---

## 🔄 Resetting Your Local Database

If you need to start over:

```bash
supabase db reset
```

This will:
1. Drop all tables
2. Reapply all migrations (baseline + seed data)
3. Give you a fresh local database

---

## 🎯 Testing Workflow

### Register a New User
1. Run `npm run local`
2. Navigate to registration page
3. Email: `test@example.com`, Password: `test123`
4. **No email confirmation needed!** You'll be logged in instantly
5. Go to Database → user_profiles and assign role_id manually for now

### Create a Test Reservation
1. Log in with your admin user
2. Navigate to Front Desk
3. Click "New Reservation"
4. Select a room (you have 55 to choose from!)
5. Add guest details
6. Save - reservation created in local database

---

## 🛠 Useful Local Development Commands

```bash
# View local Supabase status
supabase status

# Stop local Supabase
supabase stop

# View logs
supabase logs

# Access local database directly
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Open Studio (database UI)
open http://127.0.0.1:54323

# View test emails (Mailpit)
open http://127.0.0.1:54324
```

---

## 📧 Email Testing with Mailpit

All emails sent from your local app are captured by Mailpit (not actually sent).

View them at: http://127.0.0.1:54324

This is useful for testing:
- Registration confirmation emails (even though confirmations are disabled)
- Password reset emails
- Reservation confirmation emails

---

## 🔐 Environment Variables

Your `.env.local` file should have:

```bash
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_ANON_KEY=<from-supabase-start-output>
REACT_APP_ENVIRONMENT=local
```

Get the anon key from `supabase status` output.

---

## ⚡ Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| **Your App** | http://localhost:3000 | -  |
| **Supabase Studio** | http://127.0.0.1:54323 | - |
| **Supabase API** | http://127.0.0.1:54321 | - |
| **Database** | postgresql://postgres:postgres@127.0.0.1:54322/postgres | postgres / postgres |
| **Mailpit** | http://127.0.0.1:54324 | - |
| **Test Admin** | admin@test.local | admin123 |

---

## 🐛 Troubleshooting

### "user_roles table is empty"
- Run `supabase db reset` to reapply seed migrations

### "Cannot register new user"
- Make sure `enable_confirmations = false` in supabase/config.toml
- Restart Supabase: `supabase stop && supabase start`

### "No rooms available"
- Check that seed migrations ran: `SELECT COUNT(*) FROM rooms;` should return 55

### "Docker not running"
- Start Docker Desktop
- Run `supabase start` again

---

**Last Updated**: October 31, 2025
**Version**: 1.0
