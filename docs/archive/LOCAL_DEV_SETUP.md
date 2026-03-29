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

Open Studio at http://127.0.0.1:54323 and check:
- `user_roles` table should have 5 rows
- `rooms` table should have 55 rows (or 64 with all IDs)

### Step 5: Create a Test Admin User

**Via Supabase Studio (Easiest):**

1. Go to http://127.0.0.1:54323
2. Navigate to Authentication → Users
3. Click "Add user"
4. Email: `admin@test.local`
5. Password: `admin123`
6. Click "Create user"
7. Copy the user's UUID
8. Go to Table Editor → user_profiles
9. Insert new row: user_id = (UUID), role_id = 5, is_active = true

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
- **reservation_statuses**: 6 statuses
- **categories**: 8 inventory categories
- **locations**: 4 storage locations
- **pricing_tiers**: 5 pricing tiers

### ✅ Hotel Configuration
- **hotels**: 1 hotel (Hotel Porec)
- **rooms**: 55 rooms across 4 floors

### ❌ NOT Included (Start Fresh)
- No production guests, reservations, invoices, or user accounts

---

## 🔄 Resetting Your Local Database

If you need to start over:

```bash
supabase db reset
```

---

## 🛠 Useful Commands

```bash
# View local Supabase status
supabase status

# Stop local Supabase
supabase stop

# Open Studio
open http://127.0.0.1:54323

# View test emails (Mailpit)
open http://127.0.0.1:54324
```

---

## ⚡ Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| **Your App** | http://localhost:3000 | - |
| **Supabase Studio** | http://127.0.0.1:54323 | - |
| **Supabase API** | http://127.0.0.1:54321 | - |
| **Mailpit (emails)** | http://127.0.0.1:54324 | - |
| **Test Admin** | admin@test.local | admin123 |

---

**Last Updated**: October 31, 2025
