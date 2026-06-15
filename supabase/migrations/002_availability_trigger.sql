-- =============================================================
-- TRP — Availability trigger with concurrency lock
-- =============================================================
-- Enforces: overlapping confirmed bookings for a room_type
-- cannot exceed the number of active rooms in that type.
--
-- Key design points:
--   • Half-open daterange '[)' allows same-day turnover
--     (guest checks out day X, new guest checks in day X — valid).
--   • pg_advisory_xact_lock serializes concurrent INSERTs on the
--     same room_type so the COUNT is accurate under load.
--     Advisory lock key: hashtext of room_type_id::text (bigint).
--   • Trigger fires on INSERT and on UPDATE of the columns that
--     affect overlap (status, checkin_date, checkout_date,
--     room_type_id). Un-cancelling a booking re-checks availability.
-- =============================================================

CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_capacity   int;
  v_overlapping int;
  v_lock_key   bigint;
BEGIN
  -- Only enforce when booking is not cancelled.
  -- If the new status IS cancelled we can skip — freeing capacity.
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent writes on the same room_type.
  -- hashtext returns int4; cast to bigint for pg_advisory_xact_lock.
  v_lock_key := hashtext(NEW.room_type_id::text)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Capacity = number of active physical rooms for this type
  SELECT COUNT(*)
    INTO v_capacity
    FROM rooms
   WHERE room_type_id = NEW.room_type_id
     AND is_active = true;

  -- Overlapping bookings (exclude self on UPDATE, exclude cancelled)
  SELECT COUNT(*)
    INTO v_overlapping
    FROM bookings b
   WHERE b.room_type_id = NEW.room_type_id
     AND b.status      != 'cancelled'
     AND b.id          != NEW.id  -- safe on INSERT: NEW.id not yet in table
     AND daterange(b.checkin_date, b.checkout_date, '[)')
         && daterange(NEW.checkin_date, NEW.checkout_date, '[)');

  IF v_overlapping + 1 > v_capacity THEN
    RAISE EXCEPTION
      'No rooms available for room type % from % to % (capacity: %, already booked: %)',
      NEW.room_type_id,
      NEW.checkin_date,
      NEW.checkout_date,
      v_capacity,
      v_overlapping
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Fire on INSERT and on UPDATE of columns that affect availability.
-- Listing columns explicitly avoids unnecessary re-checks (e.g. payment_status change).
CREATE TRIGGER trg_check_room_availability
  BEFORE INSERT OR UPDATE OF status, checkin_date, checkout_date, room_type_id
  ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_room_availability();
