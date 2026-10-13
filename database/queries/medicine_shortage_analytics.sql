-- ============================================================================
-- LifeLink Coursework Query: Essential Medicine Shortage Analytics (DE-07)
-- Demonstrates: Multi-table JOIN, GROUP BY, HAVING, Ratio Metrics
-- Purpose: Identifies life-saving medicines whose available supply drops below safety thresholds
-- ============================================================================

SELECT 
    f.city,
    m.generic_name,
    m.dosage_form,
    m.strength,
    COUNT(DISTINCT f.id) AS stocking_facilities_count,
    COUNT(DISTINCT mi.id) AS active_batches_count,
    SUM(mi.total_units) AS total_physical_inventory,
    SUM(mi.reserved_units) AS total_reserved_inventory,
    SUM(
        CASE 
            WHEN mi.expiry_date > CURRENT_DATE AND mi.status = 'AVAILABLE'
            THEN (mi.total_units - mi.reserved_units)
            ELSE 0 
        END
    ) AS total_available_units,
    ROUND(
        (SUM(mi.reserved_units)::numeric / NULLIF(SUM(mi.total_units), 0)) * 100, 
        2
    ) AS utilization_reservation_rate_pct
FROM medicines m
JOIN medicine_inventory mi ON m.id = mi.medicine_id
JOIN facilities f ON mi.facility_id = f.id
WHERE f.is_verified = TRUE
GROUP BY f.city, m.generic_name, m.dosage_form, m.strength
HAVING SUM(
    CASE 
        WHEN mi.expiry_date > CURRENT_DATE AND mi.status = 'AVAILABLE'
        THEN (mi.total_units - mi.reserved_units)
        ELSE 0 
    END
) < 100
ORDER BY total_available_units ASC, f.city ASC;
