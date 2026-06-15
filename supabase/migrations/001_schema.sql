-- =============================================================
-- TRP Hospital Hotel Reservation — Schema Migration
-- =============================================================

-- Enable pgcrypto for gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- LOOKUP TABLES
-- =============================================================

CREATE TABLE room_types (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             varchar NOT NULL,
  price_per_night  int     NOT NULL CHECK (price_per_night >= 0),
  extra_bed_price  int     NOT NULL CHECK (extra_bed_price >= 0),
  is_active        boolean NOT NULL DEFAULT true
);

CREATE TABLE rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  name         varchar NOT NULL,
  is_active    boolean NOT NULL DEFAULT true
);

CREATE TABLE staff (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      varchar NOT NULL,
  role      varchar NOT NULL CHECK (role IN ('agent', 'reception')),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE doctors (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      varchar NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE cleaning_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL
);

CREATE TABLE discounts (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label     varchar NOT NULL,
  percent   int     NOT NULL CHECK (percent IN (0, 5, 10, 20, 100)),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE booking_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL
);

-- =============================================================
-- BOOKINGS TABLE
-- =============================================================

CREATE TABLE bookings (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Room (type set at booking time; physical room assigned at check-in)
  room_type_id                uuid NOT NULL REFERENCES room_types(id)    ON DELETE RESTRICT,
  room_id                     uuid          REFERENCES rooms(id)          ON DELETE RESTRICT,

  -- Relationships
  staff_id                    uuid NOT NULL REFERENCES staff(id)          ON DELETE RESTRICT,
  doctor_id                   uuid NOT NULL REFERENCES doctors(id)        ON DELETE RESTRICT,
  cleaning_type_id            uuid          REFERENCES cleaning_types(id) ON DELETE RESTRICT,
  discount_id                 uuid          REFERENCES discounts(id)      ON DELETE RESTRICT,
  booking_type_id             uuid NOT NULL REFERENCES booking_types(id)  ON DELETE RESTRICT,

  -- Guest info
  guest_name                  varchar NOT NULL,
  email                       varchar,
  guest_count                 int     NOT NULL CHECK (guest_count BETWEEN 1 AND 3),

  -- Dates
  checkin_date                date    NOT NULL,
  checkout_date               date    NOT NULL,
  -- nights: cannot reference itself in another generated column, so inlined below
  nights                      int     GENERATED ALWAYS AS (checkout_date - checkin_date) STORED,

  -- Extra services
  extra_beds                  int     NOT NULL DEFAULT 0 CHECK (extra_beds BETWEEN 0 AND 2),
  needs_caretaker             boolean NOT NULL DEFAULT false,

  -- Price snapshots (copied from room_types + discounts at booking time)
  room_price_at_booking       int     NOT NULL CHECK (room_price_at_booking >= 0),
  extra_bed_price_at_booking  int     NOT NULL CHECK (extra_bed_price_at_booking >= 0),
  discount_percent_at_booking int     NOT NULL DEFAULT 0 CHECK (discount_percent_at_booking IN (0, 5, 10, 20, 100)),

  -- total_price inlines (checkout_date - checkin_date) directly — Postgres forbids
  -- a generated column referencing another generated column (nights).
  -- Formula: (room + extra_bed_per_night * extra_beds) * nights * (100 - discount%) / 100
  total_price int GENERATED ALWAYS AS (
    (
      room_price_at_booking
      + extra_bed_price_at_booking * extra_beds
    )
    * (checkout_date - checkin_date)
    * (100 - discount_percent_at_booking)
    / 100
  ) STORED,

  -- Status
  status          varchar NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'confirmed', 'checked_out', 'cancelled')),
  payment_status  varchar NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending', 'paid')),

  -- Audit
  created_by uuid REFERENCES staff(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES staff(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Integrity constraints
  CONSTRAINT checkout_after_checkin CHECK (checkout_date > checkin_date)
);

-- Index to speed up availability overlap queries
CREATE INDEX idx_bookings_room_type_dates
  ON bookings (room_type_id, checkin_date, checkout_date)
  WHERE status != 'cancelled';

-- =============================================================
-- updated_at trigger
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
