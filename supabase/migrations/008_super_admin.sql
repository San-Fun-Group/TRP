-- =============================================================
-- TRP — Add super_admin role
--
-- Role hierarchy:
--   super_admin  — everything + can manage user roles (via admin API)
--   admin        — everything except managing user roles
--   reception    — assign rooms, update status / payment
--   agent        — create bookings, check availability
--   housekeeping — view bookings, update cleaning type (via RPC)
--
-- At the DB/RLS level super_admin and admin share the same permissions.
-- The distinction is enforced at the application layer: only super_admin
-- can call the service-role user-management endpoints.
-- =============================================================

-- =============================================================
-- 1. Update staff.role CHECK constraint
-- =============================================================

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('super_admin', 'admin', 'agent', 'reception', 'housekeeping'));

-- =============================================================
-- 2. Update RLS policies — add super_admin wherever admin appears
-- =============================================================

-- ── room_types ──
DROP POLICY IF EXISTS "room_types: admin write" ON room_types;
CREATE POLICY "room_types: admin write"
  ON room_types FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── rooms ──
DROP POLICY IF EXISTS "rooms: admin write" ON rooms;
CREATE POLICY "rooms: admin write"
  ON rooms FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── staff ──
DROP POLICY IF EXISTS "staff: admin write" ON staff;
CREATE POLICY "staff: admin write"
  ON staff FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── doctors ──
DROP POLICY IF EXISTS "doctors: admin write" ON doctors;
CREATE POLICY "doctors: admin write"
  ON doctors FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── cleaning_types ──
DROP POLICY IF EXISTS "cleaning_types: admin write" ON cleaning_types;
CREATE POLICY "cleaning_types: admin write"
  ON cleaning_types FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── discounts ──
DROP POLICY IF EXISTS "discounts: admin write" ON discounts;
CREATE POLICY "discounts: admin write"
  ON discounts FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── bookings: insert ──
DROP POLICY IF EXISTS "bookings: insert" ON bookings;
CREATE POLICY "bookings: insert"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'agent', 'reception'));

-- ── bookings: reception update ──
DROP POLICY IF EXISTS "bookings: reception update" ON bookings;
CREATE POLICY "bookings: reception update"
  ON bookings FOR UPDATE TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin', 'reception'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'reception'));

-- ── update_booking_cleaning_type RPC — already checks role internally ──
-- No change needed; function body already handles permission checks.
-- Just re-create to add super_admin to the allowed list.
CREATE OR REPLACE FUNCTION update_booking_cleaning_type(
  p_booking_id       uuid,
  p_cleaning_type_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() NOT IN ('super_admin', 'admin', 'housekeeping', 'reception') THEN
    RAISE EXCEPTION 'Insufficient permissions to update cleaning type'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE bookings
     SET cleaning_type_id = p_cleaning_type_id,
         updated_at        = now()
   WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
