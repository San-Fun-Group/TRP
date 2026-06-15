-- doctor_id and cleaning_type_id are now assigned after booking
-- (by reception / housekeeping), not at booking time.
ALTER TABLE bookings ALTER COLUMN doctor_id DROP NOT NULL;
