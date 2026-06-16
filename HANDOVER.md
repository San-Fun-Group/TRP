# Handover Briefing: TRP Hotel Management System

This document outlines the architectural safeguards and technical constraints for the TRP Hotel project.

## 🚀 High-Level Tech Stack
The project uses a bleeding-edge stack. Do not assume standard React 18 / Next.js 14 patterns apply:
- **Frontend**: Next.js 16 (App Router) + React 19 (using modern Server Actions and Transitions).
- **Backend**: Supabase (Postgres + Auth).
- **Styling**: Tailwind CSS v4 (Configured via CSS variables in `globals.css` rather than a JS config).
- **Timezone**: Hard-locked to `Asia/Bangkok`.

## 🛡️ "Defense in Depth" Security Model
Security is enforced at multiple layers. If you modify one, ensure the others remain intact.

### 1. Role-Based Access Control (RBAC)
- **Authority**: Roles are stored in `user.app_metadata.role`. **Never** use `user_metadata`, as it is client-writable.
- **Hierarchy**: `super_admin` > `admin` > `reception` > `agent` > `housekeeping`.
- **Enforcement**: 
    - **Middleware**: `src/proxy.ts` handles route-level redirects.
    - **Database**: Row Level Security (RLS) in `003_rls.sql` uses a custom `current_user_role()` function to check the JWT metadata directly.

### 2. Pricing Integrity
- **The Rule**: Never trust price calculations or amounts sent from the client.
- **Implementation**: The `createBooking` server action re-fetches `room_price` and `discount_percent` from the database using the IDs provided.
- **Calculation**: The `total_price` is a **generated column** in Postgres. It cannot be manually set by an INSERT or UPDATE statement; the database is the final word on the price.

### 3. Concurrency & Availability
- **The Rule**: No overbooking, even during simultaneous requests.
- **Implementation**: Real-time availability is enforced via a Postgres trigger (`check_room_availability`).
- **Locking**: It uses `pg_advisory_xact_lock` on the `room_type_id`. This serializes requests for the same room type during the transaction to ensure the `COUNT` of overlapping bookings is always accurate.

## 📅 Localization: Thai Buddhist Calendar
- **Storage**: All dates are stored as standard ISO strings (`YYYY-MM-DD`).
- **Display**: The UI (specifically `DateRangePicker` and `booking-form.tsx`) must display years in the Thai Buddhist format (Current Year + 543).
- **Utility**: Use the `thaiDate` helper for formatting, which uses the `th-TH` locale.

## 🎨 UI & Styling (Tailwind v4)
- **Theme**: The project follows a "Gold and Purple" luxury aesthetic.
- **Variables**: Use the CSS variables defined in `globals.css` (e.g., `var(--gold)`, `var(--primary)`, `var(--surface)`).
- **Typography**: 
    - **Headings/Prices**: `Cormorant Garamond` (Luxury feel).
    - **Body**: `DM Sans` (Readability).

## 📂 Critical Files Reference
| Purpose | File Path |
|---|---|
| **Authoritative Booking Logic** | `src/lib/actions/bookings.ts` |
| **Availability Triggers** | `supabase/migrations/002_functions.sql` |
| **RLS Policies** | `supabase/migrations/003_rls.sql` |
| **Middleware/Proxy** | `src/proxy.ts` |
| **Theme Definitions** | `src/app/globals.css` |

## ⚠️ Known Implementation Details
- **Housekeeping**: Can only update cleaning statuses via a specific `SECURITY DEFINER` RPC (`update_booking_cleaning_type`) because they lack general UPDATE permissions on the bookings table.
- **Database Grants**: PostgreSQL evaluates GRANTs before RLS. Ensure `authenticated` has SELECT/INSERT/UPDATE grants in `001_schema.sql` before defining RLS policies.

---
*End of Briefing*