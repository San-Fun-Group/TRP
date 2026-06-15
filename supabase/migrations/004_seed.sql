-- =============================================================
-- TRP — Seed data
-- =============================================================

-- =============================================================
-- Room type + rooms
-- =============================================================

INSERT INTO room_types (id, name, price_per_night, extra_bed_price, is_active)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Standard',
  2500,
  1000,
  true
);

INSERT INTO rooms (id, room_type_id, name, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '401', true),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '402', true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '403', true),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', '404', true);

-- =============================================================
-- Staff (16 sales agents)
-- TODO: The Thai names in the PRD had a mojibake encoding issue.
--       Replace each placeholder below with the correct full name.
-- =============================================================

INSERT INTO staff (name, role, is_active) VALUES
  ('กันต์สินี คุณาเกษมสิทธิ์',  'agent', true),
  ('กุสุมา ศรีโคตร',             'agent', true),
  ('จิตรฤทัย ปั้นเกตุ',          'agent', true),
  ('จิรนันท์ ฉัตรรุ่งมณีชัย',    'agent', true),
  ('ธีรวัฒน์ เพชรดี',            'agent', true),
  ('ปณชัย เชยอุบล',              'agent', true),
  ('ภีรภัทร แซ่ตั้ง',            'agent', true),
  ('ริญญลักษมิ์ เพชรดี',         'agent', true),
  ('ศิริพร ฮู้คี้',              'agent', true),
  ('ศุภวรรณ จั่นเพชร',           'agent', true),
  ('สริญณุษ ดอนทองแดง',          'agent', true),
  ('สุธาทิพย์ มีพรบูชา',         'agent', true),
  ('สุภาภรณ์ แดงเทศ',            'agent', true),
  ('อรุณเพ็ญ เจิมจันทึก',        'agent', true),
  ('อารยา จันทร์ต๊ะ',            'agent', true),
  ('อารียา จันทร์สำเภา',         'agent', true);

-- =============================================================
-- Doctors (24)
-- =============================================================

INSERT INTO doctors (name, is_active) VALUES
  ('Dr. Choladhis',  true),
  ('Dr. Suwannee',   true),
  ('Dr. Chaiyot',    true),
  ('Dr. Boat',       true),
  ('Dr. Nutty',      true),
  ('Dr. Ann 1',      true),
  ('Dr. Khanti',     true),
  ('Dr. Aom',        true),
  ('Dr. Nui',        true),
  ('Dr. Wan',        true),
  ('Dr. Sombat',     true),
  ('Dr. Am',         true),
  ('Dr. Thank',      true),
  ('Dr. Pim',        true),
  ('Dr. Joule',      true),
  ('Dr. Prok',       true),
  ('Dr. Book',       true),
  ('Dr. Kie',        true),
  ('Dr. Ann 2',      true),
  ('หมอแมน',         true),
  ('หมอหมิว',        true),
  ('อจ.หมอหน่อย',   true),
  ('Dr. Boss',       true),
  ('Dr. Mind',       true);

-- =============================================================
-- Cleaning types (5)
-- =============================================================

INSERT INTO cleaning_types (name) VALUES
  ('Amenity in room'),
  ('Mini Cleaning'),
  ('Full Cleaning'),
  ('Cleaned'),
  ('Out of order');

-- =============================================================
-- Discounts (5)
-- =============================================================

INSERT INTO discounts (label, percent, is_active) VALUES
  ('0%',   0,   true),
  ('5%',   5,   true),
  ('10%',  10,  true),
  ('20%',  20,  true),
  ('100%', 100, true);

-- =============================================================
-- Booking types (3) — confirm exact values with the team (PRD §13 item 1)
-- =============================================================

INSERT INTO booking_types (name) VALUES
  ('normal'),
  ('staff'),
  ('VIP comp');
