-- ============================================================================
-- LifeLink Coursework Query: Data-Quality Audit & Integrity Verification (DE-05)
-- Demonstrates: Subqueries, UNION ALL, Anti-Joins, Data-Quality Invariant Tests
-- Purpose: Identifies orphaned rows, negative counts, date anomalies, and corrupted reservations
-- Expected Result on Valid Database: 0 rows returned for all audit categories
-- ============================================================================

-- 1. Negative or Inconsistent Stock Counts Audit
SELECT 
    'BLOOD_INVENTORY' AS entity_table,
    id AS record_id,
    'Negative total units' AS audit_violation,
    jsonb_build_object('total_units', total_units) AS anomaly_details
FROM blood_inventory
WHERE total_units < 0

UNION ALL

SELECT 
    'BLOOD_INVENTORY' AS entity_table,
    id AS record_id,
    'Reserved units exceed total units' AS audit_violation,
    jsonb_build_object('total_units', total_units, 'reserved_units', reserved_units) AS anomaly_details
FROM blood_inventory
WHERE reserved_units > total_units OR reserved_units < 0

UNION ALL

SELECT 
    'MEDICINE_INVENTORY' AS entity_table,
    id AS record_id,
    'Negative or excessive reserved units' AS audit_violation,
    jsonb_build_object('total_units', total_units, 'reserved_units', reserved_units) AS anomaly_details
FROM medicine_inventory
WHERE total_units < 0 OR reserved_units < 0 OR reserved_units > total_units

-- 2. Chronological Inversion Audit (Expiry on or before collection)
UNION ALL

SELECT 
    'BLOOD_INVENTORY' AS entity_table,
    id AS record_id,
    'Expiry date is before or equal to collection date' AS audit_violation,
    jsonb_build_object('collection_date', collection_date, 'expiry_date', expiry_date) AS anomaly_details
FROM blood_inventory
WHERE expiry_date <= collection_date

-- 3. Active Reservations on Expired Inventory Audit
UNION ALL

SELECT 
    'INVENTORY_RESERVATIONS' AS entity_table,
    ir.id AS record_id,
    'Active reservation held against expired blood inventory' AS audit_violation,
    jsonb_build_object('reservation_status', ir.status, 'batch_expiry', bi.expiry_date) AS anomaly_details
FROM inventory_reservations ir
JOIN blood_inventory bi ON ir.blood_inventory_id = bi.id
WHERE ir.status = 'ACTIVE' AND bi.expiry_date <= CURRENT_DATE

UNION ALL

SELECT 
    'INVENTORY_RESERVATIONS' AS entity_table,
    ir.id AS record_id,
    'Active reservation held against expired medicine inventory' AS audit_violation,
    jsonb_build_object('reservation_status', ir.status, 'batch_expiry', mi.expiry_date) AS anomaly_details
FROM inventory_reservations ir
JOIN medicine_inventory mi ON ir.medicine_inventory_id = mi.id
WHERE ir.status = 'ACTIVE' AND mi.expiry_date <= CURRENT_DATE

-- 4. Orphaned Foreign Keys Audit (Referential Integrity Check)
UNION ALL

SELECT 
    'BLOOD_INVENTORY' AS entity_table,
    bi.id AS record_id,
    'Orphaned record: facility_id does not exist' AS audit_violation,
    jsonb_build_object('facility_id', bi.facility_id) AS anomaly_details
FROM blood_inventory bi
LEFT JOIN facilities f ON bi.facility_id = f.id
WHERE f.id IS NULL

UNION ALL

SELECT 
    'MEDICINE_INVENTORY' AS entity_table,
    mi.id AS record_id,
    'Orphaned record: medicine_id does not exist' AS audit_violation,
    jsonb_build_object('medicine_id', mi.medicine_id) AS anomaly_details
FROM medicine_inventory mi
LEFT JOIN medicines m ON mi.medicine_id = m.id
WHERE m.id IS NULL;
