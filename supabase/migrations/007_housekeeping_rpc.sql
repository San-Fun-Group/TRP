-- =============================================================
-- Fix: restrict housekeeping to updating cleaning_type_id only.
--
-- The broad UPDATE policy from 006 allows housekeeping to overwrite
-- any booking column (status, payment_status, dates, etc.).
-- Column-level GRANTs can't target a single role in Supabase because
-- all JWT users share the same 'authenticated' DB role.
--
-- Solution: drop the broad policy; route the update through a
-- SECURITY DEFINER function that only touches cleaning_type_id.
-- The function checks role internally, so the DB enforces the scope.
-- =============================================================

-- Drop the overly-permissive housekeeping UPDATE policy from 006
DROP POLICY IF EXISTS "bookings: housekeeping update" ON bookings;

-- SECURITY DEFINER function: only updates cleaning_type_id.
-- Callable by housekeeping, reception, and admin.
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
  IF current_user_role() NOT IN ('housekeeping', 'reception', 'admin') THEN
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

-- Allow all authenticated users to call it; the function checks role internally
GRANT EXECUTE ON FUNCTION update_booking_cleaning_type(uuid, uuid) TO authenticated;
