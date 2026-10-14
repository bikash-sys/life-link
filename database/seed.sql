-- ============================================================================
-- LifeLink Seed Data — Synthetic Demo Data for Query Demonstrations
-- IMPORTANT: All data is fictional. No real patient, donor, or facility data.
-- Target: PostgreSQL 14+ with LifeLink DDL schema loaded
-- ============================================================================

-- ============================================================================
-- 1. USERS (3 admins, 4 facility staff, 3 regular users)
-- ============================================================================
INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'admin@lifelink.org',      'scrypt_placeholder_hash_01', 'Arun Sharma',     '+91-9800000001', 'ADMIN'),
  ('a0000001-0000-0000-0000-000000000002', 'neha.admin@lifelink.org', 'scrypt_placeholder_hash_02', 'Neha Gupta',      '+91-9800000002', 'ADMIN'),
  ('a0000001-0000-0000-0000-000000000003', 'ravi.admin@lifelink.org', 'scrypt_placeholder_hash_03', 'Ravi Patel',      '+91-9800000003', 'ADMIN'),
  ('b0000001-0000-0000-0000-000000000001', 'staff.central@demo.org',  'scrypt_placeholder_hash_04', 'Priya Nair',      '+91-9800000004', 'FACILITY_STAFF'),
  ('b0000001-0000-0000-0000-000000000002', 'staff.city@demo.org',     'scrypt_placeholder_hash_05', 'Vikram Singh',    '+91-9800000005', 'FACILITY_STAFF'),
  ('b0000001-0000-0000-0000-000000000003', 'staff.bb@demo.org',       'scrypt_placeholder_hash_06', 'Anita Desai',     '+91-9800000006', 'FACILITY_STAFF'),
  ('b0000001-0000-0000-0000-000000000004', 'staff.pharm@demo.org',    'scrypt_placeholder_hash_07', 'Suresh Kumar',    '+91-9800000007', 'FACILITY_STAFF'),
  ('c0000001-0000-0000-0000-000000000001', 'donor.jane@example.com',  'scrypt_placeholder_hash_08', 'Jane Doe',        '+91-9800000008', 'USER'),
  ('c0000001-0000-0000-0000-000000000002', 'user.rahul@example.com',  'scrypt_placeholder_hash_09', 'Rahul Verma',     '+91-9800000009', 'USER'),
  ('c0000001-0000-0000-0000-000000000003', 'user.meera@example.com',  'scrypt_placeholder_hash_10', 'Meera Joshi',     '+91-9800000010', 'USER');

-- ============================================================================
-- 2. FACILITIES (2 hospitals, 1 blood bank, 1 pharmacy — all verified;
--    1 unverified hospital for contrast)
-- ============================================================================
INSERT INTO facilities (id, name, facility_type, address, city, state, postal_code, latitude, longitude, contact_phone, contact_email, is_verified, manager_user_id) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'Central General Hospital',       'HOSPITAL',   '12 MG Road',        'Mumbai',    'Maharashtra', '400001', 19.0760000, 72.8777000, '+91-22-2000001', 'cgh@lifelink.org',  TRUE,  'a0000001-0000-0000-0000-000000000001'),
  ('f0000001-0000-0000-0000-000000000002', 'City Care Medical Center',       'HOSPITAL',   '45 Brigade Road',   'Bangalore', 'Karnataka',   '560001', 12.9716000, 77.5946000, '+91-80-3000002', 'ccmc@lifelink.org', TRUE,  'a0000001-0000-0000-0000-000000000002'),
  ('f0000001-0000-0000-0000-000000000003', 'Regional Blood Bank',            'BLOOD_BANK', '78 Civil Lines',    'Mumbai',    'Maharashtra', '400002', 19.0850000, 72.8880000, '+91-22-4000003', 'rbb@lifelink.org',  TRUE,  'a0000001-0000-0000-0000-000000000003'),
  ('f0000001-0000-0000-0000-000000000004', 'HealthFirst Pharmacy',           'PHARMACY',   '22 Park Street',    'Bangalore', 'Karnataka',   '560002', 12.9800000, 77.6000000, '+91-80-5000004', 'hfp@lifelink.org',  TRUE,  NULL),
  ('f0000001-0000-0000-0000-000000000005', 'New Sunrise Hospital (Pending)', 'HOSPITAL',   '99 Outer Ring Road', 'Delhi',     'Delhi',       '110001', 28.6139000, 77.2090000, '+91-11-6000005', NULL,                FALSE, NULL);

-- Link staff to facilities
UPDATE users SET facility_id = 'f0000001-0000-0000-0000-000000000001' WHERE id = 'b0000001-0000-0000-0000-000000000001';
UPDATE users SET facility_id = 'f0000001-0000-0000-0000-000000000002' WHERE id = 'b0000001-0000-0000-0000-000000000002';
UPDATE users SET facility_id = 'f0000001-0000-0000-0000-000000000003' WHERE id = 'b0000001-0000-0000-0000-000000000003';
UPDATE users SET facility_id = 'f0000001-0000-0000-0000-000000000004' WHERE id = 'b0000001-0000-0000-0000-000000000004';

-- ============================================================================
-- 3. BLOOD COMPONENTS CATALOG (6 standard components)
-- ============================================================================
INSERT INTO blood_components (id, code, name, default_shelf_life_days, storage_temp_celsius, description) VALUES
  ('bc000001-0000-0000-0000-000000000001', 'WB',   'Whole Blood',              35,  '2-6°C',   'Standard whole blood donation unit'),
  ('bc000001-0000-0000-0000-000000000002', 'PRBC', 'Packed Red Blood Cells',   42,  '2-6°C',   'Red cell concentrate for transfusion'),
  ('bc000001-0000-0000-0000-000000000003', 'FFP',  'Fresh Frozen Plasma',      365, '-25°C',   'Plasma frozen within 8 hours of collection'),
  ('bc000001-0000-0000-0000-000000000004', 'PLT',  'Platelet Concentrate',     5,   '20-24°C', 'Single donor platelet unit, constant agitation'),
  ('bc000001-0000-0000-0000-000000000005', 'CRYO', 'Cryoprecipitate',          365, '-25°C',   'Fibrinogen-rich plasma derivative'),
  ('bc000001-0000-0000-0000-000000000006', 'GRN',  'Granulocyte Concentrate',  24,  '20-24°C', 'White cell concentrate for neutropenic patients');

-- ============================================================================
-- 4. BLOOD INVENTORY
-- ============================================================================
INSERT INTO blood_inventory (id, facility_id, component_id, blood_group, batch_number, total_units, reserved_units, collection_date, expiry_date, storage_location, status) VALUES
  -- Central General Hospital, Mumbai — healthy stock
  ('aa000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000002', 'O+',  'CGH-PRBC-2024-001', 50, 10, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '32 days',  'Cold Room A',  'AVAILABLE'),
  ('aa000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000002', 'A+',  'CGH-PRBC-2024-002', 30,  5, CURRENT_DATE - INTERVAL '5 days',  CURRENT_DATE + INTERVAL '37 days',  'Cold Room A',  'AVAILABLE'),
  ('aa000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000001', 'B+',  'CGH-WB-2024-003',   20,  3, CURRENT_DATE - INTERVAL '8 days',  CURRENT_DATE + INTERVAL '27 days',  'Cold Room B',  'AVAILABLE'),
  -- Expiring in 4 days
  ('aa000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000004', 'AB+', 'CGH-PLT-2024-004',   8,  2, CURRENT_DATE - INTERVAL '1 day',   CURRENT_DATE + INTERVAL '4 days',   'Agitator 1',   'AVAILABLE'),
  -- Already expired
  ('aa000001-0000-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000002', 'O-',  'CGH-PRBC-2024-005', 15,  0, CURRENT_DATE - INTERVAL '50 days', CURRENT_DATE - INTERVAL '5 days',   'Cold Room A',  'EXPIRED'),
  -- LOW STOCK (shortage trigger)
  ('aa000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000003', 'AB-', 'CGH-FFP-2024-006',  10,  5, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '305 days', 'Freezer A',    'AVAILABLE'),

  -- City Care Medical Center, Bangalore
  ('aa000001-0000-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000002', 'bc000001-0000-0000-0000-000000000002', 'O+',  'CCMC-PRBC-2024-001', 25,  5, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '30 days',  'Unit 1',       'AVAILABLE'),
  ('aa000001-0000-0000-0000-000000000008', 'f0000001-0000-0000-0000-000000000002', 'bc000001-0000-0000-0000-000000000001', 'A-',  'CCMC-WB-2024-002',   12,  0, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '25 days',  'Unit 2',       'AVAILABLE'),
  -- CRITICAL: zero available after reservations
  ('aa000001-0000-0000-0000-000000000009', 'f0000001-0000-0000-0000-000000000002', 'bc000001-0000-0000-0000-000000000004', 'B-',  'CCMC-PLT-2024-003',   5,  5, CURRENT_DATE - INTERVAL '3 days',  CURRENT_DATE + INTERVAL '2 days',   'Agitator 2',   'RESERVED'),

  -- Regional Blood Bank, Mumbai — large stock
  ('aa000001-0000-0000-0000-000000000010', 'f0000001-0000-0000-0000-000000000003', 'bc000001-0000-0000-0000-000000000002', 'O+',  'RBB-PRBC-2024-001', 100, 20, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '28 days',  'Vault 1',      'AVAILABLE'),
  ('aa000001-0000-0000-0000-000000000011', 'f0000001-0000-0000-0000-000000000003', 'bc000001-0000-0000-0000-000000000003', 'A+',  'RBB-FFP-2024-002',   60, 10, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'Vault 2',      'AVAILABLE'),
  ('aa000001-0000-0000-0000-000000000012', 'f0000001-0000-0000-0000-000000000003', 'bc000001-0000-0000-0000-000000000005', 'O-',  'RBB-CRYO-2024-003',   8,  3, CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE + INTERVAL '325 days', 'Deep Freeze',  'AVAILABLE'),
  -- Expiring tomorrow
  ('aa000001-0000-0000-0000-000000000013', 'f0000001-0000-0000-0000-000000000003', 'bc000001-0000-0000-0000-000000000004', 'B+',  'RBB-PLT-2024-004',    4,  0, CURRENT_DATE - INTERVAL '4 days',  CURRENT_DATE + INTERVAL '1 day',    'Agitator 3',   'AVAILABLE');

-- ============================================================================
-- 5. MEDICINES CATALOG (8 essential medicines)
-- ============================================================================
INSERT INTO medicines (id, name, generic_name, dosage_form, strength, manufacturer, category, description) VALUES
  ('dd000001-0000-0000-0000-000000000001', 'Amoxil 500',       'Amoxicillin',           'CAPSULE',     '500mg',    'Cipla Ltd',       'Antibiotic',   'Broad-spectrum penicillin-class antibiotic'),
  ('dd000001-0000-0000-0000-000000000002', 'Crocin Advance',   'Paracetamol',           'TABLET',      '650mg',    'GSK Pharma',      'Analgesic',    'Fever and pain relief'),
  ('dd000001-0000-0000-0000-000000000003', 'Insulin Actrapid', 'Insulin (Regular)',      'VIAL',        '100IU/ml', 'Novo Nordisk',    'Antidiabetic', 'Short-acting insulin for diabetes'),
  ('dd000001-0000-0000-0000-000000000004', 'Adrenaline Inj',   'Epinephrine',           'INJECTION',   '1mg/ml',   'Sun Pharma',      'Emergency',    'Emergency treatment of anaphylaxis'),
  ('dd000001-0000-0000-0000-000000000005', 'ORS Sachet',       'Oral Rehydration Salts','SYRUP',       '20.5g/L',  'WHO Standard',    'Rehydration',  'Oral rehydration therapy for dehydration'),
  ('dd000001-0000-0000-0000-000000000006', 'Ceftriaxone IV',   'Ceftriaxone',           'IV_INFUSION', '1g',       'Aurobindo Pharma','Antibiotic',   'Third-generation cephalosporin'),
  ('dd000001-0000-0000-0000-000000000007', 'Metformin SR',     'Metformin',             'TABLET',      '500mg',    'USV Ltd',         'Antidiabetic', 'First-line therapy for type 2 diabetes'),
  ('dd000001-0000-0000-0000-000000000008', 'Azithromycin 250', 'Azithromycin',          'TABLET',      '250mg',    'Alkem Labs',      'Antibiotic',   'Macrolide antibiotic for respiratory infections');

-- ============================================================================
-- 6. MEDICINE INVENTORY
-- ============================================================================
INSERT INTO medicine_inventory (id, facility_id, medicine_id, batch_number, total_units, reserved_units, expiry_date, storage_location, status) VALUES
  -- Central General Hospital, Mumbai
  ('ee000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000001', 'CGH-AMX-2024-001', 200, 30,  CURRENT_DATE + INTERVAL '240 days', 'Pharmacy Shelf A', 'AVAILABLE'),
  ('ee000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000002', 'CGH-PCM-2024-001', 500, 50,  CURRENT_DATE + INTERVAL '420 days', 'Pharmacy Shelf B', 'AVAILABLE'),
  ('ee000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000003', 'CGH-INS-2024-001',  40, 10,  CURRENT_DATE + INTERVAL '90 days',  'Refrigerator 1',   'AVAILABLE'),
  -- LOW STOCK emergency medicine
  ('ee000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000004', 'CGH-EPI-2024-001',  15,  5,  CURRENT_DATE + INTERVAL '30 days',  'Emergency Kit',    'AVAILABLE'),
  -- EXPIRED
  ('ee000001-0000-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000005', 'CGH-ORS-2024-001', 100,  0,  CURRENT_DATE - INTERVAL '10 days',  'Store Room',       'EXPIRED'),

  -- City Care Medical Center, Bangalore
  ('ee000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000002', 'dd000001-0000-0000-0000-000000000001', 'CCMC-AMX-2024-001', 80,  20, CURRENT_DATE + INTERVAL '210 days', 'Ward Pharmacy',    'AVAILABLE'),
  ('ee000001-0000-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000002', 'dd000001-0000-0000-0000-000000000006', 'CCMC-CEF-2024-001', 25,   5, CURRENT_DATE + INTERVAL '180 days', 'ICU Cabinet',      'AVAILABLE'),
  -- Very low Insulin
  ('ee000001-0000-0000-0000-000000000008', 'f0000001-0000-0000-0000-000000000002', 'dd000001-0000-0000-0000-000000000003', 'CCMC-INS-2024-001', 10,   8, CURRENT_DATE + INTERVAL '120 days', 'Refrigerator 2',   'AVAILABLE'),

  -- HealthFirst Pharmacy, Bangalore
  ('ee000001-0000-0000-0000-000000000009', 'f0000001-0000-0000-0000-000000000004', 'dd000001-0000-0000-0000-000000000002', 'HFP-PCM-2024-001', 300, 10,  CURRENT_DATE + INTERVAL '300 days', 'Counter Display',  'AVAILABLE'),
  ('ee000001-0000-0000-0000-000000000010', 'f0000001-0000-0000-0000-000000000004', 'dd000001-0000-0000-0000-000000000007', 'HFP-MET-2024-001', 150, 15,  CURRENT_DATE + INTERVAL '270 days', 'Shelf C',          'AVAILABLE'),
  ('ee000001-0000-0000-0000-000000000011', 'f0000001-0000-0000-0000-000000000004', 'dd000001-0000-0000-0000-000000000008', 'HFP-AZT-2024-001',  60,  5,  CURRENT_DATE + INTERVAL '240 days', 'Shelf D',          'AVAILABLE'),
  -- Expiring very soon
  ('ee000001-0000-0000-0000-000000000012', 'f0000001-0000-0000-0000-000000000004', 'dd000001-0000-0000-0000-000000000004', 'HFP-EPI-2024-001',   5,  0,  CURRENT_DATE + INTERVAL '5 days',   'Emergency Box',    'AVAILABLE');

-- ============================================================================
-- 7. REQUESTS
-- ============================================================================
INSERT INTO requests (id, request_number, requester_id, facility_id, request_type, urgency, status, clinical_notes) VALUES
  ('ab000001-0000-0000-0000-000000000001', 'REQ-2024-0001', 'c0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'BLOOD',    'URGENT',   'RESERVED',  'Pre-surgical transfusion required'),
  ('ab000001-0000-0000-0000-000000000002', 'REQ-2024-0002', 'c0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002', 'MEDICINE', 'NORMAL',   'PENDING',   'Monthly insulin refill'),
  ('ab000001-0000-0000-0000-000000000003', 'REQ-2024-0003', 'c0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'BLOOD',    'CRITICAL', 'FULFILLED', 'Emergency trauma, O- blood needed');

INSERT INTO request_items (id, request_id, blood_component_id, blood_group, medicine_id, quantity_requested, quantity_reserved, quantity_fulfilled) VALUES
  ('ac000001-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000002', 'O+',  NULL, 5, 5, 0),
  ('ac000001-0000-0000-0000-000000000002', 'ab000001-0000-0000-0000-000000000002', NULL, NULL, 'dd000001-0000-0000-0000-000000000003', 10, 0, 0),
  ('ac000001-0000-0000-0000-000000000003', 'ab000001-0000-0000-0000-000000000003', 'bc000001-0000-0000-0000-000000000002', 'O-',  NULL, 3, 3, 3);

INSERT INTO inventory_reservations (id, request_item_id, blood_inventory_id, medicine_inventory_id, reserved_quantity, status) VALUES
  ('ad000001-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', NULL, 5, 'ACTIVE'),
  ('ad000001-0000-0000-0000-000000000002', 'ac000001-0000-0000-0000-000000000003', 'aa000001-0000-0000-0000-000000000005', NULL, 3, 'CONFIRMED');

-- ============================================================================
-- 8. REQUEST STATUS HISTORY
-- ============================================================================
INSERT INTO request_status_history (id, request_id, from_status, to_status, changed_by_user_id, notes) VALUES
  ('ae000001-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001', NULL,       'PENDING',   'c0000001-0000-0000-0000-000000000001', 'Request submitted by donor'),
  ('ae000001-0000-0000-0000-000000000002', 'ab000001-0000-0000-0000-000000000001', 'PENDING',  'RESERVED',  'b0000001-0000-0000-0000-000000000001', 'Blood units reserved by staff'),
  ('ae000001-0000-0000-0000-000000000003', 'ab000001-0000-0000-0000-000000000003', NULL,       'PENDING',   'c0000001-0000-0000-0000-000000000003', 'Emergency request submitted'),
  ('ae000001-0000-0000-0000-000000000004', 'ab000001-0000-0000-0000-000000000003', 'PENDING',  'RESERVED',  'b0000001-0000-0000-0000-000000000001', 'Units allocated from blood bank'),
  ('ae000001-0000-0000-0000-000000000005', 'ab000001-0000-0000-0000-000000000003', 'RESERVED', 'FULFILLED', 'b0000001-0000-0000-0000-000000000001', 'Transfusion completed successfully');

-- ============================================================================
-- 9. AUDIT LOGS
-- ============================================================================
INSERT INTO audit_logs (id, entity_type, entity_id, actor_id, action, details) VALUES
  ('af000001-0000-0000-0000-000000000001', 'FACILITY', 'f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'CREATE',  '{"name": "Central General Hospital"}'),
  ('af000001-0000-0000-0000-000000000002', 'FACILITY', 'f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'VERIFY',  '{"is_verified": true}'),
  ('af000001-0000-0000-0000-000000000003', 'REQUEST',  'ab000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'FULFILL', '{"units_dispensed": 3, "blood_group": "O-"}');
