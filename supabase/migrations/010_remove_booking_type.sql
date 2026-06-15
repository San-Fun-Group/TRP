-- 010_remove_booking_type.sql
-- Remove booking_type from the data model entirely.
-- Idempotent: safe to run multiple times.

-- 1. Drop the foreign-key column from bookings (if it still exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_type_id'
  ) THEN
    ALTER TABLE bookings DROP COLUMN booking_type_id;
  END IF;
END $$;

-- 2. Drop the lookup table (if it still exists)
DROP TABLE IF EXISTS booking_types;
