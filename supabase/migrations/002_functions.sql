-- =============================================================
-- TRP — DB functions
-- =============================================================

-- ── 1. Role helper ────────────────────────────────────────────
-- Reads from app_metadata (server-only via service role).
-- Never use user_metadata — it is client-writable.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- ── 2. Availability trigger ───────────────────────────────────
-- Enforces: overlapping non-cancelled bookings for a room_type
-- cannot exceed the number of active physical rooms in that type.
--
-- Half-open daterange '[)' allows same-day turnover.
-- pg_advisory_xact_lock serializes concurrent INSERTs on the same
-- room_type so the COUNT is accurate under load.
CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_capacity    int;
  v_overlapping int;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.room_type_id::text)::bigint);

  SELECT COUNT(*) INTO v_capacity
    FROM rooms
   WHERE room_type_id = NEW.room_type_id AND is_active = true;

  SELECT COUNT(*) INTO v_overlapping
    FROM bookings b
   WHERE b.room_type_id = NEW.room_type_id
     AND b.status      != 'cancelled'
     AND b.id          != NEW.id
     AND daterange(b.checkin_date, b.checkout_date, '[)')
         && daterange(NEW.checkin_date, NEW.checkout_date, '[)');

  IF v_overlapping + 1 > v_capacity THEN
    RAISE EXCEPTION
      'No rooms available for room type % from % to % (capacity: %, booked: %)',
      NEW.room_type_id, NEW.checkin_date, NEW.checkout_date, v_capacity, v_overlapping
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_room_availability
  BEFORE INSERT OR UPDATE OF status, checkin_date, checkout_date, room_type_id
  ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_room_availability();

-- ── 3. Housekeeping RPC ───────────────────────────────────────
-- SECURITY DEFINER so it bypasses RLS and only touches cleaning_type_id.
-- Column-level grants can't target individual roles in Supabase because
-- all JWT users share the 'authenticated' DB role.
CREATE OR REPLACE FUNCTION update_booking_cleaning_type(
  p_booking_id       uuid,
  p_cleaning_type_id uuid
)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user_role() NOT IN ('super_admin', 'admin', 'housekeeping', 'reception') THEN
    RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = 'P0001';
  END IF;

  UPDATE bookings
     SET cleaning_type_id = p_cleaning_type_id, updated_at = now()
   WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_booking_cleaning_type(uuid, uuid) TO authenticated;
