# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # production build
npm run lint         # ESLint (eslint-config-next/core-web-vitals + typescript)
npx tsc --noEmit     # type-check without building
```

Pre-commit (husky + lint-staged) runs `eslint --fix` + `tsc --noEmit` automatically on staged `.ts/.tsx` files.

## Commit messages

- Subject line: `type: imperative description`, no period, under ~70 chars — e.g. `fix: client-controlled pricing in createBooking`
- Type prefix is one of: `feat`, `fix`, `docs`, `refactor`, `chore`
- Body (optional, for non-trivial changes): `-` bullet points explaining what changed and why, not a line-by-line diff narration
- No `Co-Authored-By` trailers
- One feature/fix per commit — don't bundle unrelated features together. Small incidental cleanup (deleting an empty file, fixing a typo, etc.) can ride along in the same commit as the feature it was noticed alongside

## Architecture

**Stack**: Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth)

### Route layout

```
src/app/
  page.tsx                  — root redirect only (middleware handles routing)
  not-found.tsx             — global 404 page
  login/                    — public, email+password auth
  auth/callback/            — OAuth/magic-link exchange
  (main)/                   — auth-gated group layout
    layout.tsx              — session check + NavBar
    error.tsx               — error boundary for all (main) routes
    home/page.tsx           — occupancy dashboard + recent bookings
    booking/new/            — IPD booking form (page.tsx + booking-form.tsx + date-range-picker.tsx)
    housekeeping/           — cleaning type updates per booking
    admin/
      page.tsx              — dashboard: today's arrivals + unpaid confirmed
      bookings/page.tsx     — full booking list with filters + CSV export
      bookings/[id]/        — booking detail + actions (status, payment, room, doctor)
      users/page.tsx        — user management (create, role change, delete)
      settings/page.tsx     — room types, rooms, doctors, staff, discounts, cleaning types
  api/
    availability/route.ts   — GET ?checkin=&checkout= → per-room-type availability counts
    bookings/export/route.ts — GET with filters → CSV download
```

### Auth & roles

Authentication uses Supabase Auth (email+password). The role is stored in `user.app_metadata.role` — **never** `user_metadata`, which is client-writable.

Five roles in the system:

| Role | Access |
|---|---|
| `super_admin` | everything |
| `admin` | full CRUD on all tables |
| `reception` | update bookings (status, payment, room assignment) |
| `agent` | create bookings, read lookup tables |
| `housekeeping` | read bookings, update `cleaning_type_id` via RPC only |

Role enforcement is **double-layered**:
1. **Middleware** (`src/proxy.ts`) — Next.js 16 uses `proxy.ts` as the middleware entry point (replaces `middleware.ts` from older versions). Redirects unauthorized routes before the page renders.
2. **Supabase RLS** (`003_rls.sql`) — enforces at the DB layer via `current_user_role()` SQL function that reads from the JWT `app_metadata`

### Supabase clients

- `src/lib/supabase/server.ts` → `createClient()` for Server Components / Route Handlers / Server Actions. `createServiceClient()` bypasses RLS — server-side only.
- `src/lib/supabase/client.ts` → `createClient()` for Client Components (browser).

### Pricing security

Prices are **never** client-supplied. The `createBooking` server action (`src/lib/actions/bookings.ts`) re-fetches `room_price_at_booking` and `extra_bed_price_at_booking` from the DB before inserting. The `total_price` column is a `GENERATED ALWAYS AS` expression in Postgres — cannot be overridden by the client.

### Availability enforcement

Two-layer:
1. **Optimistic check** — `GET /api/availability` before form submit (UI feedback)
2. **Hard constraint** — `check_room_availability()` DB trigger on `bookings` INSERT/UPDATE. Uses `pg_advisory_xact_lock` to serialize concurrent bookings on the same room type. Raises `ERRCODE = 'P0001'` if over capacity.

### Database

Migrations are in `supabase/migrations/` — run in filename order on a fresh project:
- `001_schema.sql` — tables, generated columns, GRANTs
- `002_functions.sql` — `current_user_role()`, availability trigger, housekeeping RPC
- `003_rls.sql` — RLS policies (idempotent — uses `DROP POLICY IF EXISTS` before every `CREATE POLICY`)
- `004_seed.sql` — lookup data (idempotent via `ON CONFLICT DO UPDATE`)

**GRANT before RLS**: PostgreSQL evaluates GRANTs before RLS. If a table has no `GRANT SELECT TO authenticated`, queries silently return empty/null — even if RLS policy says `USING (true)`. All GRANTs live in `001_schema.sql`.

### Date handling

All dates are ISO `YYYY-MM-DD` strings. Bangkok timezone is used for "today":
```ts
new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
```

Thai Buddhist calendar display adds 543 to the year. The `DateRangePicker` component handles this internally.

### Styling conventions

- CSS variables defined in `src/app/globals.css`: `--primary` (purple), `--gold`, `--success`, `--error`, `--text`, `--text-muted`, `--text-light`, `--border`, `--border-soft`, `--bg`, `--surface`
- Tailwind v4 — no `tailwind.config.ts`; configuration is in CSS via `@theme`
- Card style via `.card` utility class; gold CTA via `.btn-gold`
- Cormorant Garamond for headings/prices; DM Sans for body

## Environment variables

Copy `.env.local.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-side only, never expose to client
```
