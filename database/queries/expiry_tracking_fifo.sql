-- ============================================================================
-- LifeLink Coursework Query: Expiry Tracking & FIFO Dispatch Order (DE-08)
-- Demonstrates: WINDOW FUNCTIONS: ROW_NUMBER(), DENSE_RANK(), Cumulative SUM() OVER
-- Purpose: Ranks inventory batches by expiry date for First-In-First-Expired (FIFO) dispatching
-- ============================================================================

-- 1. FIFO Blood Component Batch Dispatch Schedule
SELECT 
    f.name AS facility_name,
    bc.code AS component_code,
    bi.blood_group,
    bi.batch_number,
    bi.expiry_date,
    (bi.expiry_date - CURRENT_DATE) AS days_until_expiry,
    (bi.total_units - bi.reserved_units) AS batch_available_units,
    
    -- Window Function 1: Assigns sequential priority for dispatching stock
    ROW_NUMBER() OVER (
        PARTITION BY bi.facility_id, bi.component_id, bi.blood_group
        ORDER BY bi.expiry_date ASC, bi.collection_date ASC
    ) AS facility_dispatch_fifo_priority,

    -- Window Function 2: System-wide urgency rank across blood banks
    DENSE_RANK() OVER (
        PARTITION BY bi.blood_group, bi.component_id
        ORDER BY bi.expiry_date ASC
    ) AS regional_urgency_rank,

    -- Window Function 3: Running cumulative available inventory within facility
    SUM(bi.total_units - bi.reserved_units) OVER (
        PARTITION BY bi.facility_id, bi.component_id, bi.blood_group
        ORDER BY bi.expiry_date ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_available_units
FROM blood_inventory bi
JOIN facilities f ON bi.facility_id = f.id
JOIN blood_components bc ON bi.component_id = bc.id
WHERE 
    bi.status = 'AVAILABLE'
    AND bi.expiry_date > CURRENT_DATE
    AND (bi.total_units - bi.reserved_units) > 0
ORDER BY bi.facility_id, bi.component_id, bi.blood_group, facility_dispatch_fifo_priority ASC;

-- 2. Impending Expiry Alert (Batches expiring within 7 days)
SELECT 
    f.name AS facility_name,
    f.contact_phone,
    bc.code AS component_code,
    bi.blood_group,
    bi.batch_number,
    bi.expiry_date,
    (bi.expiry_date - CURRENT_DATE) AS days_remaining,
    (bi.total_units - bi.reserved_units) AS units_at_risk_of_wastage
FROM blood_inventory bi
JOIN facilities f ON bi.facility_id = f.id
JOIN blood_components bc ON bi.component_id = bc.id
WHERE 
    bi.status = 'AVAILABLE'
    AND bi.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
    AND (bi.total_units - bi.reserved_units) > 0
ORDER BY bi.expiry_date ASC;
