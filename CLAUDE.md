# CLAUDE.md

@AGENTS.md

## Working style

**Ask before assuming** — especially for design, layout, visual direction, or feature scope. If there is no mockup, ask for one or ask for direction before implementing. A wrong assumption wastes more time than a short question.

**One question at a time** — identify the most blocking uncertainty and ask only that.

**UI text is Thai** — all user-facing labels, buttons, and status text follow existing Thai conventions in the codebase. Do not invent new English labels.

**Visual design** — if there is no mockup and the task involves layout or color, ask before implementing.

## Team roles

Adopt the perspective fully when the user asks "as [role]…":

| Role | Focus |
|---|---|
| **UX/UI** | Hierarchy, spacing, contrast, component clarity, design system consistency |
| **Frontend** | Server/Client component split, `useTransition`, `router.refresh()`, type safety, Tailwind v4 |
| **Backend** | Server Actions, Supabase queries, RLS, pricing security, trigger logic, migrations |
| **DevOps** | Build, env vars, pre-commit hooks, CI/CD |
| **Infra** | Supabase config, auth, GRANT/RLS layering |

## Commands

```bash
npm run dev       # dev server :3000
npm run build     # production build
npm run lint      # ESLint
npx tsc --noEmit  # type-check
```

Pre-commit (husky + lint-staged): `eslint --fix` + `tsc --noEmit` on staged `.ts/.tsx`.

## Commit messages

- `type: imperative description` — no period, under ~70 chars
- Types: `feat` `fix` `docs` `refactor` `chore`
- No `Co-Authored-By` trailers
- One feature/fix per commit

## Architecture

**Stack**: Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth)

### Routes

```
src/app/
  login/                    — public auth
  auth/callback/            — OAuth/magic-link exchange
  (main)/                   — auth-gated layout (session check + NavBar)
    home/                   — occupancy dashboard
    booking/new/            — IPD booking form
    housekeeping/           — cleaning type updates
    reception/              — front desk: room board + check-in queue
    reception/history/      — booking search, filters, inline editing
    admin/                  — arrivals dashboard
    admin/bookings/         — full list + CSV export
    admin/bookings/[id]/    — booking detail + actions
    admin/users/            — user management
    admin/settings/         — room types, rooms, doctors, staff, discounts
  api/availability/         — GET ?checkin=&checkout= → availability counts
  api/bookings/export/      — CSV download
```

### Auth & roles

Role stored in `user.app_metadata.role` — **never** `user_metadata` (client-writable).

| Role | Access |
|---|---|
| `super_admin` | everything |
| `admin` | full CRUD |
| `reception` | update bookings (status, payment, room) |
| `agent` | create bookings, read lookups |
| `housekeeping` | read bookings, update `cleaning_type_id` via RPC only |

Enforcement is double-layered: **Middleware** (`src/proxy.ts`) + **Supabase RLS** (`003_rls.sql` via `current_user_role()` from JWT `app_metadata`).

### Supabase clients

- `src/lib/supabase/server.ts` → Server Components / Route Handlers / Server Actions. `createServiceClient()` bypasses RLS.
- `src/lib/supabase/client.ts` → Client Components.

### Pricing security

Prices are never client-supplied. `createBooking` re-fetches prices from DB. `total_price` is a `GENERATED ALWAYS AS` Postgres column.

### Availability enforcement

1. Optimistic: `GET /api/availability` before submit
2. Hard: `check_room_availability()` trigger with `pg_advisory_xact_lock`, raises `ERRCODE = 'P0001'`

### Database

Migrations in `supabase/migrations/` in filename order:
- `001_schema.sql` — tables, GRANTs
- `002_functions.sql` — `current_user_role()`, triggers, RPC
- `003_rls.sql` — RLS policies (idempotent)
- `004_seed.sql` — lookup data (idempotent)

**GRANT before RLS**: missing `GRANT SELECT TO authenticated` causes silent empty results even with `USING (true)`. All GRANTs in `001_schema.sql`.

### Known gotchas

- **`today` must be inside the component function** — never at module level. Module-level dates are computed once at load time and go stale across midnight.
- **`router.refresh()` after server actions in Client Components** — Server Component data does not re-render automatically. Call `router.refresh()` after every mutation.
- **All Supabase mutations include `updated_by: null`** — do not omit.
- **Cormorant Garamond ascender space** — large serif has built-in top whitespace. Fix with `marginTop: '-0.15em'`.

### Date handling

All dates: ISO `YYYY-MM-DD`. Bangkok "today":
```ts
new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
```
Thai Buddhist year = Gregorian + 543. `DateRangePicker` handles this internally.

### Styling

- CSS vars in `src/app/globals.css`: `--primary` `--gold` `--mauve` `--bg` `--surface` `--text` `--text-muted` `--text-light` `--border` `--border-soft` `--error` `--success`
- Tailwind v4 — config in CSS via `@theme`, no `tailwind.config.ts`
- `.card` for cards, `.btn-gold` for primary CTA
- Cormorant Garamond for headings/prices; DM Sans for body

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-side only
```
