-- =============================================================
-- TRP — Row Level Security
-- =============================================================
-- The anon key ships inside the Next.js client bundle (publicly
-- visible). RLS is therefore mandatory on every table.
--
-- Role is read from the JWT claim set by Supabase Auth via the
-- helper function current_user_role() below.
--
-- Roles:
--   agent     — creates bookings, reads availability data
--   reception — full read on bookings, updates status/payment/room
--
-- Trigger functions (check_room_availability, set_updated_at) run
-- as SECURITY DEFINER so they can read across RLS boundaries.
-- =============================================================

-- Helper: extract role from JWT claims
-- app_metadata is server-only (set via service role). user_metadata is client-writable
-- and must never be used for authorization decisions.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- =============================================================
-- room_types
-- =============================================================
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read room types (for availability UI)
CREATE POLICY "room_types: authenticated read"
  ON room_types FOR SELECT
  TO authenticated
  USING (true);

-- Only reception can write (insert/update/delete)
CREATE POLICY "room_types: reception write"
  ON room_types FOR ALL
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');

-- =============================================================
-- rooms
-- =============================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms: authenticated read"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rooms: reception write"
  ON rooms FOR ALL
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');

-- =============================================================
-- staff
-- =============================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff: authenticated read"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "staff: reception write"
  ON staff FOR ALL
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');

-- =============================================================
-- doctors
-- =============================================================
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors: authenticated read"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "doctors: reception write"
  ON doctors FOR ALL
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');

-- =============================================================
-- cleaning_types
-- =============================================================
ALTER TABLE cleaning_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleaning_types: authenticated read"
  ON cleaning_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cleaning_types: reception write"
  ON cleaning_types FOR ALL
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');

-- =============================================================
-- discounts
-- =============================================================
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discounts: authenticated read"
  ON discounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "discounts: reception write"
  ON discounts FOR ALL
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');


-- =============================================================
-- bookings
-- =============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Both roles can read all bookings
CREATE POLICY "bookings: authenticated read"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

-- Agents can create bookings
CREATE POLICY "bookings: agent insert"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('agent', 'reception'));

-- Reception can update any booking (status, payment_status, room_id, etc.)
-- Agents cannot update bookings once created (they call reception to cancel/change)
CREATE POLICY "bookings: reception update"
  ON bookings FOR UPDATE
  TO authenticated
  USING (current_user_role() = 'reception')
  WITH CHECK (current_user_role() = 'reception');

-- No hard deletes — soft cancel via status column only
CREATE POLICY "bookings: no delete"
  ON bookings FOR DELETE
  TO authenticated
  USING (false);
