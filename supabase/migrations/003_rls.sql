-- =============================================================
-- TRP — Row Level Security (final — 5 roles)
-- =============================================================
-- Roles:
--   super_admin  — everything (same DB perms as admin; app-layer gates user mgmt)
--   admin        — full CRUD on all tables
--   reception    — update bookings (status, payment, room assignment)
--   agent        — create bookings, read all lookup/availability data
--   housekeeping — read bookings, update cleaning_type_id via RPC only
-- =============================================================

-- ── room_types ───────────────────────────────────────────────
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_types: read"
  ON room_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "room_types: admin write"
  ON room_types FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── rooms ─────────────────────────────────────────────────────
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms: read"
  ON rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "rooms: admin write"
  ON rooms FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── staff ─────────────────────────────────────────────────────
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff: read"
  ON staff FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff: admin write"
  ON staff FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── doctors ───────────────────────────────────────────────────
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors: read"
  ON doctors FOR SELECT TO authenticated USING (true);

CREATE POLICY "doctors: admin write"
  ON doctors FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── cleaning_types ────────────────────────────────────────────
ALTER TABLE cleaning_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleaning_types: read"
  ON cleaning_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "cleaning_types: admin write"
  ON cleaning_types FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── discounts ─────────────────────────────────────────────────
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discounts: read"
  ON discounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "discounts: admin write"
  ON discounts FOR ALL TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── bookings ──────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings: read"
  ON bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "bookings: insert"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'agent', 'reception'));

CREATE POLICY "bookings: reception update"
  ON bookings FOR UPDATE TO authenticated
  USING     (current_user_role() IN ('super_admin', 'admin', 'reception'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'reception'));

-- Housekeeping updates go through update_booking_cleaning_type() RPC (SECURITY DEFINER).
-- No broad UPDATE policy for housekeeping.

-- No hard deletes — cancel via status = 'cancelled' only
CREATE POLICY "bookings: no delete"
  ON bookings FOR DELETE TO authenticated USING (false);
