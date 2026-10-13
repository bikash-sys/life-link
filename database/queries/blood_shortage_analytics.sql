-- ============================================================================
-- LifeLink Coursework Query: Blood Component Shortage Analytics (DE-07)
-- Demonstrates: GROUP BY, HAVING, Conditional Aggregation, CASE WHEN expressions
-- Purpose: Aggregates regional blood reserves and flags critically depleted blood groups
-- ============================================================================

WITH RegionalBloodTotals AS (
    SELECT 
        f.city,
        bc.code AS component_code,
        bi.blood_group,
        COUNT(DISTINCT bi.id) AS total_batches_count,
        SUM(bi.total_units) AS gross_physical_units,
        SUM(bi.reserved_units) AS currently_reserved_units,
        SUM(
            CASE 
                WHEN bi.expiry_date > CURRENT_DATE AND bi.status = 'AVAILABLE' 
                THEN (bi.total_units - bi.reserved_units) 
                ELSE 0 
            END
        ) AS net_available_units,
        SUM(
            CASE 
                WHEN bi.expiry_date <= CURRENT_DATE 
                THEN bi.total_units 
                ELSE 0 
            END
        ) AS expired_unusable_units
    FROM facilities f
    JOIN blood_inventory bi ON f.id = bi.facility_id
    JOIN blood_components bc ON bi.component_id = bc.id
    WHERE f.is_verified = TRUE
    GROUP BY f.city, bc.code, bi.blood_group
)
SELECT 
    city,
    component_code,
    blood_group,
    gross_physical_units,
    currently_reserved_units,
    net_available_units,
    expired_unusable_units,
    CASE 
        WHEN net_available_units = 0 THEN 'CRITICAL: ZERO STOCK'
        WHEN net_available_units < 15 THEN 'HIGH DEFICIT: IMPENDING SHORTAGE'
        WHEN net_available_units < 30 THEN 'MODERATE: MONITOR CLOSELY'
        ELSE 'ADEQUATE BUFFER'
    END AS shortage_alert_level
FROM RegionalBloodTotals
WHERE net_available_units < 30
ORDER BY net_available_units ASC, city ASC;
