# TRP Hotel — IPD Reservation System

Internal room reservation system for TRP Hospital Hotel, replacing a Monday.com workflow. Staff book IPD (In-Patient Department) rooms, track occupancy, and manage housekeeping.

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Postgres database + Auth)
- **Tailwind CSS v4**
- **Vercel** (deployment)

## Setup

**1. Clone and install**

```bash
git clone https://github.com/sanfungroup/TRP.git
cd TRP
npm install
```

**2. Configure environment**

```bash
cp .env.local.example .env.local
# Fill in your Supabase project URL, anon key, and service role key
```

**3. Initialize the database**

In the Supabase SQL Editor, run migrations in order:

```
supabase/migrations/001_schema.sql   — tables + GRANTs
supabase/migrations/002_functions.sql — DB functions + triggers
supabase/migrations/003_rls.sql      — Row Level Security policies
supabase/migrations/004_seed.sql     — lookup data (room types, staff, etc.)
```

**4. Create users**

Add users in the Supabase Auth dashboard, then set their role via the SQL Editor:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "agent"}'::jsonb
WHERE email = 'staff@hospital.com';
```

Available roles: `super_admin`, `admin`, `reception`, `agent`, `housekeeping`

**5. Run locally**

```bash
npm run dev   # http://localhost:3000
```

## Role permissions

| Role | Can do |
|---|---|
| `super_admin` / `admin` | Everything — manage users, lookup tables, all bookings |
| `reception` | Update booking status, payment, room assignment |
| `agent` | Create new bookings |
| `housekeeping` | View bookings, update cleaning type |

## CI

GitHub Actions runs type-check and lint on every push to `main` and every pull request. PRs that fail cannot be merged.

Pre-commit hooks (husky) run the same checks locally before each commit.
