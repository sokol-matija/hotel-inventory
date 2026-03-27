# Hotel Inventory Management System

A hotel management system for a Croatian hotel, covering front desk operations, inventory, room service, fiscalization, and guest management.

## Features

- **Hotel Front Desk**: 14-day timeline calendar with drag-to-book, conflict detection, check-in/out workflows, and 20+ keyboard shortcuts
- **Inventory Management**: Track stock across locations with expiration alerts and audit trail
- **Room Service**: Ordering system with real-time inventory integration
- **Guest Management**: Guest profiles, booking history, multi-language email communication (HR/DE/EN)
- **Fiscalization**: Croatian Tax Authority (e-Računi) compliance — ZKI signing, FINA P12 certificate, PDF invoices
- **Notifications**: In-app toasts (sonner), NTFY mobile push, browser Web Push API

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 6 |
| Routing | TanStack Router v1 (file-based, codegen) |
| Data fetching | TanStack Query v5 |
| Auth / DB | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Global state | Zustand v5 (`src/stores/authStore.ts` — auth only) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI primitives) |
| Forms | react-hook-form v7 + zod v4 |
| Icons | lucide-react |
| Drag & Drop | @dnd-kit (inventory), react-dnd (hotel timeline) |
| Dates | date-fns v4 |
| Animations | GSAP (existing code), motion/Framer Motion v12 (new animations) |
| i18n | i18next — Croatian (HR), German (DE), English (EN) |
| PDF | jsPDF + jspdf-autotable |
| Toasts | sonner v2 |
| Notifications | NTFY (mobile push) + Web Push API |
| Tests | Vitest v4 + Testing Library (unit/integration), Playwright (e2e) |

## Quick Start

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Required environment variables (`.env.local`):
```
VITE_SUPABASE_URL=https://gkbpthurkucotikjefra.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check only |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (watch mode) |
| `npm run test:run` | Vitest (single run) |
| `npm run test:e2e` | Playwright e2e |
| `npm run validate:fast` | Typecheck + lint + tests + build (~22s) |

## Project Structure

```
src/
├── components/
│   ├── hotel/
│   │   ├── frontdesk/    # Timeline, reservations, check-in/out, guests
│   │   ├── pricing/      # Pricing tier management
│   │   ├── companies/    # Company/travel agency management
│   │   ├── finance/      # Invoices, fiscalization UI
│   │   └── shared/       # Shared hotel components
│   ├── items/            # Inventory items UI
│   ├── locations/        # Location management UI
│   ├── orders/           # Room service orders UI
│   ├── audit/            # Audit log UI
│   ├── dashboard/        # Dashboard analytics
│   ├── settings/         # User settings
│   ├── auth/             # Login, onboarding
│   ├── layout/           # Sidebar, nav, layout wrappers
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── supabase.ts           # Supabase singleton client
│   ├── database.types.ts     # Auto-generated Supabase types (never edit manually)
│   ├── queries/
│   │   ├── queryKeys.ts      # Single source of truth for all TQ cache keys
│   │   └── hooks/            # One TQ hook file per domain entity
│   ├── hotel/
│   │   ├── types.ts          # Domain types + re-exports from hooks
│   │   ├── schemas/          # Zod validation schemas (used with react-hook-form)
│   │   └── services/         # Business logic (pricing, conflict detection, booking)
│   ├── fiscalization/        # Croatian Tax Authority integration
│   ├── eracuni/              # e-Računi service
│   └── emailService.ts       # Resend API via Supabase Edge Function
├── routes/                   # TanStack Router file-based routes
├── stores/
│   └── authStore.ts          # Zustand auth store (only global state)
├── i18n/                     # Translation files (hr, de, en)
└── scripts/                  # Shell scripts and validation pipelines
```

## Architecture

**Data flow:**
```
Component → TQ hook → supabase.from('table').select() → Supabase
```

Hooks in `src/lib/queries/hooks/` call Supabase directly. Services in `src/lib/hotel/services/` contain business logic only (pricing calculations, conflict detection, multi-step booking operations).

**Types:** Hooks export types derived via `QueryData<ReturnType<typeof buildXxxQuery>>` — stays in sync with schema migrations automatically.

**Realtime:** `useRealtimeSync.ts` subscribes to Supabase Realtime and calls `queryClient.invalidateQueries()` — no polling needed.

## Authentication

- Supabase Auth (Google OAuth + email/password)
- Zustand store (`authStore.ts`) — single source of truth for `user`, `session`, `hasProfile`, `loading`
- Auth guard at route level (TanStack Router), not in components

## Database

Supabase project: `gkbpthurkucotikjefra` (production — no local dev environment)

After schema changes, regenerate types:
```bash
supabase gen types typescript --project-id gkbpthurkucotikjefra > src/lib/database.types.ts
```

## License

Private and proprietary. All rights reserved.
