-- =============================================================
-- TRP — Expand roles from 2 to 4
-- Roles: admin | reception | agent | housekeeping
--
-- admin        — full access to everything
-- reception    — view all bookings, assign rooms, update status/payment
-- agent        — create bookings, read availability/lookup data
-- housekeeping — view bookings, update cleaning_type_id only
-- =============================================================

-- =============================================================
-- 1. Update staff.role CHECK constraint
-- =============================================================

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin', 'agent', 'reception', 'housekeeping'));

-- =============================================================
-- 2. Drop all existing RLS policies and recreate for 4 roles
-- =============================================================

-- ── room_types ──
DROP POLICY IF EXISTS "room_types: authenticated read"  ON room_types;
DROP POLICY IF EXISTS "room_types: reception write"     ON room_types;

CREATE POLICY "room_types: read"
  ON room_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "room_types: admin write"
  ON room_types FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── rooms ──
DROP POLICY IF EXISTS "rooms: authenticated read" ON rooms;
DROP POLICY IF EXISTS "rooms: reception write"    ON rooms;

CREATE POLICY "rooms: read"
  ON rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "rooms: admin write"
  ON rooms FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── staff ──
DROP POLICY IF EXISTS "staff: authenticated read" ON staff;
DROP POLICY IF EXISTS "staff: reception write"    ON staff;

CREATE POLICY "staff: read"
  ON staff FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff: admin write"
  ON staff FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── doctors ──
DROP POLICY IF EXISTS "doctors: authenticated read" ON doctors;
DROP POLICY IF EXISTS "doctors: reception write"    ON doctors;

CREATE POLICY "doctors: read"
  ON doctors FOR SELECT TO authenticated USING (true);

CREATE POLICY "doctors: admin write"
  ON doctors FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── cleaning_types ──
DROP POLICY IF EXISTS "cleaning_types: authenticated read" ON cleaning_types;
DROP POLICY IF EXISTS "cleaning_types: reception write"    ON cleaning_types;

CREATE POLICY "cleaning_types: read"
  ON cleaning_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "cleaning_types: admin write"
  ON cleaning_types FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── discounts ──
DROP POLICY IF EXISTS "discounts: authenticated read" ON discounts;
DROP POLICY IF EXISTS "discounts: reception write"    ON discounts;

CREATE POLICY "discounts: read"
  ON discounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "discounts: admin write"
  ON discounts FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── booking_types ──
DROP POLICY IF EXISTS "booking_types: authenticated read" ON booking_types;
DROP POLICY IF EXISTS "booking_types: reception write"    ON booking_types;

CREATE POLICY "booking_types: read"
  ON booking_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "booking_types: admin write"
  ON booking_types FOR ALL TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── bookings ──
DROP POLICY IF EXISTS "bookings: authenticated read" ON bookings;
DROP POLICY IF EXISTS "bookings: agent insert"       ON bookings;
DROP POLICY IF EXISTS "bookings: reception update"   ON bookings;
DROP POLICY IF EXISTS "bookings: no delete"          ON bookings;

-- All authenticated roles can read bookings
CREATE POLICY "bookings: read"
  ON bookings FOR SELECT TO authenticated USING (true);

-- Agents and admin can create bookings
CREATE POLICY "bookings: insert"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('agent', 'reception', 'admin'));

-- Reception and admin: full update (status, payment, room assignment, etc.)
CREATE POLICY "bookings: reception update"
  ON bookings FOR UPDATE TO authenticated
  USING     (current_user_role() IN ('reception', 'admin'))
  WITH CHECK (current_user_role() IN ('reception', 'admin'));

-- Housekeeping updates are handled via the update_booking_cleaning_type()
-- SECURITY DEFINER function (migration 007) — no broad UPDATE policy here.

-- No hard deletes for any role — cancel via status only
CREATE POLICY "bookings: no delete"
  ON bookings FOR DELETE TO authenticated USING (false);
