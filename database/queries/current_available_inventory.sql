-- ============================================================================
-- LifeLink Coursework Query: Current Available Inventory (DE-06 / DE-07)
-- Demonstrates: Multi-table JOINs, conditional expressions, date filtering
-- Purpose: Retrieves real-time unreserved, non-expired stock across all verified facilities
-- ============================================================================

-- 1. Available Blood Units per Verified Facility
SELECT 
    f.name AS facility_name,
    f.city,
    f.state,
    bc.code AS component_code,
    bc.name AS component_name,
    bi.blood_group,
    bi.batch_number,
    bi.total_units,
    bi.reserved_units,
    (bi.total_units - bi.reserved_units) AS available_units,
    bi.collection_date,
    bi.expiry_date,
    (bi.expiry_date - CURRENT_DATE) AS days_until_expiry,
    bi.storage_location
FROM blood_inventory bi
JOIN facilities f ON bi.facility_id = f.id
JOIN blood_components bc ON bi.component_id = bc.id
WHERE 
    f.is_verified = TRUE
    AND bi.status = 'AVAILABLE'
    AND bi.expiry_date > CURRENT_DATE
    AND (bi.total_units - bi.reserved_units) > 0
ORDER BY f.city, bc.code, bi.blood_group, bi.expiry_date ASC;

-- 2. Available Medicine Units per Verified Pharmacy / Hospital
SELECT 
    f.name AS facility_name,
    f.city,
    m.name AS medicine_name,
    m.generic_name,
    m.dosage_form,
    m.strength,
    mi.batch_number,
    mi.total_units,
    mi.reserved_units,
    (mi.total_units - mi.reserved_units) AS available_units,
    mi.expiry_date,
    (mi.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM medicine_inventory mi
JOIN facilities f ON mi.facility_id = f.id
JOIN medicines m ON mi.medicine_id = m.id
WHERE 
    f.is_verified = TRUE
    AND mi.status = 'AVAILABLE'
    AND mi.expiry_date > CURRENT_DATE
    AND (mi.total_units - mi.reserved_units) > 0
ORDER BY f.city, m.generic_name, mi.expiry_date ASC;
