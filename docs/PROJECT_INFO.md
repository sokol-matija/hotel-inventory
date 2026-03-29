# Hotel Porec - Project Information

## Supabase Configuration

**Project ID:** `gkbpthurkucotikjefra`
**Project URL:** `https://gkbpthurkucotikjefra.supabase.co`
**Database URL:** `db.gkbpthurkucotikjefra.supabase.co`

> There is no local Supabase instance. All development targets the production project.

---

## Environment Variables

```bash
# .env.local (Vite uses VITE_ prefix, not REACT_APP_)
VITE_SUPABASE_URL=https://gkbpthurkucotikjefra.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Routing | TanStack Router v1 (file-based, codegen) |
| Data fetching | TanStack Query v5 |
| Auth / DB | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Global state | Zustand v5 (auth only) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Forms | react-hook-form v7 + zod v4 |
| Tests | Vitest v4 + Testing Library + Playwright |
| i18n | i18next (Croatian, German, English) |

---

## Supabase Storage Buckets

### email-assets (Public)
- `LOGO1-hires.png` - Hotel Porec logo
- `mozaik_gp1 copy-2.png` - Mozaik background image

### hotel-assets (Public)
- `LOGO1-hires.png`
- `mozaik_gp1_copy.png`

---

## Edge Functions

| Function | Purpose |
|---|---|
| `fiscalize-invoice` | Croatian fiscal e-invoice generation (e-Racuni) |
| `send-email` | Email sending service (Resend) |
| `daily-notifications` | Daily notification cron job |

---

## Database Tables (30 tables)

| Domain | Tables |
|---|---|
| Auth | `user_roles`, `user_profiles`, `audit_logs` |
| Hotel/Rooms | `hotels`, `room_types`, `rooms`, `room_cleaning_reset_log` |
| Pricing | `pricing_seasons`, `pricing_tiers`, `room_pricing`, `booking_sources`, `labels` |
| Guests | `guests`, `guest_children`, `companies` |
| Reservations | `reservation_statuses`, `reservations`, `reservation_guests`, `reservation_daily_details`, `guest_stays`, `daily_guest_services` |
| Financials | `reservation_charges`, `invoices`, `payments`, `fiscal_records`, `room_service_orders` |
| Inventory | `categories`, `items`, `locations`, `inventory` |

See `schema_diagram.md` for full ER diagrams.

---

## Authentication

- Google OAuth + email/password via Supabase Auth
- Sessions persisted in localStorage with auto-refresh
- Role-based access: admin, reception, kitchen, housekeeping, bookkeeping
- Auth state managed by Zustand store (`src/stores/authStore.ts`)

---

## Development

```bash
npm run dev          # Dev server (Vite, hot reload)
npm run build        # Production build (output: dist/)
npm test             # Run Vitest
npm run test:e2e     # Run Playwright
npm run validate:fast # Full validation pipeline
```

---

## Deployment

- **Platform:** Vercel
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Set in Vercel dashboard

---

## Contact Information

**Hotel Porec**
- Address: 52440 Porec, Croatia
- Phone: +385(0)52/451 611
- Email: hotelporec@pu.t-com.hr
- Website: www.hotelporec.com

**Developer:** Matija Sokol

---

**Last Updated:** 2026-03-29
