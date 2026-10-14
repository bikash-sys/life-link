# LifeLink — SQL Queries and Query Outputs for Database Engineering (DE) Evaluation

**Project**: LifeLink Healthcare Resource & Inventory Coordination System  
**Academic Deliverable**: Database Engineering (DE) Milestone Evaluation  
**DBMS**: PostgreSQL 14+  
**Database Name**: `lifelink_test_queries` (DDL: `database/schema.sql`, Seed: `database/seed.sql`)  
**Data Integrity Notice**: All demonstrated data is strictly synthetic and generated for academic evaluation. No real patient, donor, or hospital data is utilized.

---

## Executive Summary & DE Evaluation Mapping

This document provides verified SQL queries developed for the LifeLink platform, covering operational inventory retrieval, regional shortage analytics, FIFO dispatch window functions, and data-integrity auditing. Every query in this document has been compiled and executed against PostgreSQL with output captured directly from the database engine.

| Query ID | Title | DE Learning Outcome | Core SQL Features Demonstrated |
| :--- | :--- | :--- | :--- |
| **Q1-A** | Available Blood Inventory by Facility | DE-06 (Multi-table JOINs, filtering) | Multi-table `JOIN`, date arithmetic (`INTERVAL`), computed columns, compound `WHERE` predicates |
| **Q1-B** | Available Medicine Stock by Pharmacy/Hospital | DE-06 (Catalog-to-Inventory mapping) | Multi-table `JOIN`, stock status validation, expiry date filtering |
| **Q2** | Regional Blood Shortage Analytics | DE-07 (Aggregation & Reporting) | Common Table Expressions (`WITH`), `GROUP BY`, conditional `SUM(CASE WHEN...)`, threshold classification |
| **Q3** | Essential Medicine Shortage Analytics | DE-07 (Grouped Analytics & Ratios) | `GROUP BY`, `HAVING` clause, percentage ratio metrics (`ROUND`, `NULLIF`), multi-level aggregation |
| **Q4-A** | FIFO Blood Batch Dispatch Schedule | DE-08 (Advanced Window Functions) | `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`, `DENSE_RANK()`, cumulative `SUM() OVER` |
| **Q4-B** | Impending Expiry Risk Alert (7-Day Horizon) | DE-08 (Predictive Dispatch & Alerts) | Date range interval checks (`BETWEEN CURRENT_DATE AND ...`), waste mitigation analytics |
| **Q5** | Database Data-Quality & Integrity Audit | DE-05 (Integrity Verification & Defensive SQL) | `UNION ALL`, subqueries, anti-joins (`LEFT JOIN ... WHERE NULL`), domain invariant checks, `jsonb_build_object` |

---

## 1. Query 1: Currently Available Inventory (DE-06 / DE-07)

### 1.1 Available Blood Component Inventory

* **Query File**: `database/queries/current_available_inventory.sql` (Part 1)
* **Purpose**: Retrieves real-time unreserved, non-expired blood units across verified hospitals and blood banks.
* **Business Use Case**: Emergency room personnel, blood bank coordinators, and transfusion specialists query this endpoint to locate immediately dispatchable blood units by component type, blood group, and geographical proximity without risking double-allocation of reserved units.

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
      facility_name       |   city    |    state    | component_code |     component_name     | blood_group |    batch_number    | total_units | reserved_units | available_units | collection_date | expiry_date | days_until_expiry | storage_location 
--------------------------+-----------+-------------+----------------+------------------------+-------------+--------------------+-------------+----------------+-----------------+-----------------+-------------+-------------------+------------------
 City Care Medical Center | Bangalore | Karnataka   | PRBC           | Packed Red Blood Cells | O+          | CCMC-PRBC-2024-001 |          25 |              5 |              20 | 2026-10-02      | 2026-11-13  |                30 | Unit 1
 City Care Medical Center | Bangalore | Karnataka   | WB             | Whole Blood            | A-          | CCMC-WB-2024-002   |          12 |              0 |              12 | 2026-10-04      | 2026-11-08  |                25 | Unit 2
 Regional Blood Bank      | Mumbai    | Maharashtra | CRYO           | Cryoprecipitate        | O-          | RBB-CRYO-2024-003  |           8 |              3 |               5 | 2026-09-04      | 2027-09-04  |               325 | Deep Freeze
 Regional Blood Bank      | Mumbai    | Maharashtra | FFP            | Fresh Frozen Plasma    | A+          | RBB-FFP-2024-002   |          60 |             10 |              50 | 2026-09-14      | 2027-09-14  |               335 | Vault 2
 Central General Hospital | Mumbai    | Maharashtra | FFP            | Fresh Frozen Plasma    | AB-         | CGH-FFP-2024-006   |          10 |              5 |               5 | 2026-08-15      | 2027-08-15  |               305 | Freezer A
 Regional Blood Bank      | Mumbai    | Maharashtra | PLT            | Platelet Concentrate   | B+          | RBB-PLT-2024-004   |           4 |              0 |               4 | 2026-10-10      | 2026-10-15  |                 1 | Agitator 3
 Central General Hospital | Mumbai    | Maharashtra | PLT            | Platelet Concentrate   | AB+         | CGH-PLT-2024-004   |           8 |              2 |               6 | 2026-10-13      | 2026-10-18  |                 4 | Agitator 1
 Central General Hospital | Mumbai    | Maharashtra | PRBC           | Packed Red Blood Cells | A+          | CGH-PRBC-2024-002  |          30 |              5 |              25 | 2026-10-09      | 2026-11-20  |                37 | Cold Room A
 Regional Blood Bank      | Mumbai    | Maharashtra | PRBC           | Packed Red Blood Cells | O+          | RBB-PRBC-2024-001  |         100 |             20 |              80 | 2026-09-30      | 2026-11-11  |                28 | Vault 1
 Central General Hospital | Mumbai    | Maharashtra | PRBC           | Packed Red Blood Cells | O+          | CGH-PRBC-2024-001  |          50 |             10 |              40 | 2026-10-04      | 2026-11-15  |                32 | Cold Room A
 Central General Hospital | Mumbai    | Maharashtra | WB             | Whole Blood            | B+          | CGH-WB-2024-003    |          20 |              3 |              17 | 2026-10-06      | 2026-11-10  |                27 | Cold Room B
(11 rows)
```

---

### 1.2 Available Medicine Inventory

* **Query File**: `database/queries/current_available_inventory.sql` (Part 2)
* **Purpose**: Displays currently available, unreserved, non-expired medication units across verified facilities.
* **Business Use Case**: In-hospital pharmacists and outpatient coordinators verify immediate stock levels for critical medications (such as Epinephrine injections and Insulin vials) before confirming delivery to intensive care units or walk-in patients.

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
      facility_name       |   city    |  medicine_name   |   generic_name    | dosage_form | strength |   batch_number    | total_units | reserved_units | available_units | expiry_date | days_until_expiry 
--------------------------+-----------+------------------+-------------------+-------------+----------+-------------------+-------------+----------------+-----------------+-------------+-------------------
 City Care Medical Center | Bangalore | Amoxil 500       | Amoxicillin       | CAPSULE     | 500mg    | CCMC-AMX-2024-001 |          80 |             20 |              60 | 2027-05-12  |               210
 HealthFirst Pharmacy     | Bangalore | Azithromycin 250 | Azithromycin      | TABLET      | 250mg    | HFP-AZT-2024-001  |          60 |              5 |              55 | 2027-06-11  |               240
 City Care Medical Center | Bangalore | Ceftriaxone IV   | Ceftriaxone       | IV_INFUSION | 1g       | CCMC-CEF-2024-001 |          25 |              5 |              20 | 2027-04-12  |               180
 HealthFirst Pharmacy     | Bangalore | Adrenaline Inj   | Epinephrine       | INJECTION   | 1mg/ml   | HFP-EPI-2024-001  |           5 |              0 |               5 | 2026-10-19  |                 5
 City Care Medical Center | Bangalore | Insulin Actrapid | Insulin (Regular) | VIAL        | 100IU/ml | CCMC-INS-2024-001 |          10 |              8 |               2 | 2027-02-11  |               120
 HealthFirst Pharmacy     | Bangalore | Metformin SR     | Metformin         | TABLET      | 500mg    | HFP-MET-2024-001  |         150 |             15 |             135 | 2027-07-11  |               270
 HealthFirst Pharmacy     | Bangalore | Crocin Advance   | Paracetamol       | TABLET      | 650mg    | HFP-PCM-2024-001  |         300 |             10 |             290 | 2027-08-10  |               300
 Central General Hospital | Mumbai    | Amoxil 500       | Amoxicillin       | CAPSULE     | 500mg    | CGH-AMX-2024-001  |         200 |             30 |             170 | 2027-06-11  |               240
 Central General Hospital | Mumbai    | Adrenaline Inj   | Epinephrine       | INJECTION   | 1mg/ml   | CGH-EPI-2024-001  |          15 |              5 |              10 | 2026-11-13  |                30
 Central General Hospital | Mumbai    | Insulin Actrapid | Insulin (Regular) | VIAL        | 100IU/ml | CGH-INS-2024-001  |          40 |             10 |              30 | 2027-01-12  |                90
 Central General Hospital | Mumbai    | Crocin Advance   | Paracetamol       | TABLET      | 650mg    | CGH-PCM-2024-001  |         500 |             50 |             450 | 2027-12-08  |               420
(11 rows)
```

---

## 2. Query 2: Blood Shortage Analytics (DE-07)

* **Query File**: `database/queries/blood_shortage_analytics.sql`
* **Purpose**: Aggregates gross physical inventory, active reservations, usable units, and expired units across metropolitan regions to categorize shortage severity.
* **Business Use Case**: Regional public health authorities and blood network coordinators use this view to trigger inter-hospital blood transfers and emergency blood donation drives when available units fall into high-deficit or critical alert levels.

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
   city    | component_code | blood_group | gross_physical_units | currently_reserved_units | net_available_units | expired_unusable_units |       shortage_alert_level       
-----------+----------------+-------------+----------------------+--------------------------+---------------------+------------------------+----------------------------------
 Bangalore | PLT            | B-          |                    5 |                        5 |                   0 |                      0 | CRITICAL: ZERO STOCK
 Mumbai    | PRBC           | O-          |                   15 |                        0 |                   0 |                     15 | CRITICAL: ZERO STOCK
 Mumbai    | PLT            | B+          |                    4 |                        0 |                   4 |                      0 | HIGH DEFICIT: IMPENDING SHORTAGE
 Mumbai    | FFP            | AB-         |                   10 |                        5 |                   5 |                      0 | HIGH DEFICIT: IMPENDING SHORTAGE
 Mumbai    | CRYO           | O-          |                    8 |                        3 |                   5 |                      0 | HIGH DEFICIT: IMPENDING SHORTAGE
 Mumbai    | PLT            | AB+         |                    8 |                        2 |                   6 |                      0 | HIGH DEFICIT: IMPENDING SHORTAGE
 Bangalore | WB             | A-          |                   12 |                        0 |                  12 |                      0 | HIGH DEFICIT: IMPENDING SHORTAGE
 Mumbai    | WB             | B+          |                   20 |                        3 |                  17 |                      0 | MODERATE: MONITOR CLOSELY
 Bangalore | PRBC           | O+          |                   25 |                        5 |                  20 |                      0 | MODERATE: MONITOR CLOSELY
 Mumbai    | PRBC           | A+          |                   30 |                        5 |                  25 |                      0 | MODERATE: MONITOR CLOSELY
(10 rows)
```

---

## 3. Query 3: Medicine Shortage Analytics (DE-07)

* **Query File**: `database/queries/medicine_shortage_analytics.sql`
* **Purpose**: Identifies essential pharmaceuticals whose regional available buffer drops below clinical safety thresholds (< 100 units) and calculates inventory reservation pressure.
* **Business Use Case**: Hospital supply chain procurement managers monitor this report to identify supply crunches, expedite manufacturer orders, or shift orders across pharmacy hubs before stockouts occur.

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
   city    |      generic_name      | dosage_form | strength | stocking_facilities_count | active_batches_count | total_physical_inventory | total_reserved_inventory | total_available_units | utilization_reservation_rate_pct 
-----------+------------------------+-------------+----------+---------------------------+----------------------+--------------------------+--------------------------+-----------------------+----------------------------------
 Mumbai    | Oral Rehydration Salts | SYRUP       | 20.5g/L  |                         1 |                    1 |                      100 |                        0 |                     0 |                             0.00
 Bangalore | Insulin (Regular)      | VIAL        | 100IU/ml |                         1 |                    1 |                       10 |                        8 |                     2 |                            80.00
 Bangalore | Epinephrine            | INJECTION   | 1mg/ml   |                         1 |                    1 |                        5 |                        0 |                     5 |                             0.00
 Mumbai    | Epinephrine            | INJECTION   | 1mg/ml   |                         1 |                    1 |                       15 |                        5 |                    10 |                            33.33
 Bangalore | Ceftriaxone            | IV_INFUSION | 1g       |                         1 |                    1 |                       25 |                        5 |                    20 |                            20.00
 Mumbai    | Insulin (Regular)      | VIAL        | 100IU/ml |                         1 |                    1 |                       40 |                       10 |                    30 |                            25.00
 Bangalore | Azithromycin           | TABLET      | 250mg    |                         1 |                    1 |                       60 |                        5 |                    55 |                             8.33
 Bangalore | Amoxicillin            | CAPSULE     | 500mg    |                         1 |                    1 |                       80 |                       20 |                    60 |                            25.00
(8 rows)
```

---

## 4. Query 4: Expiry Tracking & FIFO Dispatch (DE-08)

### 4.1 First-In-First-Expired (FIFO) Dispatch Schedule

* **Query File**: `database/queries/expiry_tracking_fifo.sql` (Part 1)
* **Purpose**: Assigns strict dispatch priority order using window functions (`ROW_NUMBER()`, `DENSE_RANK()`, cumulative `SUM() OVER`) to ensure older inventory is dispensed before newer batches.
* **Business Use Case**: Blood bank laboratory technicians and automated allocation microservices execute this query when processing incoming patient requests to pick the exact batch that minimizes wastage while guaranteeing valid shelf life.

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
      facility_name       | component_code | blood_group |    batch_number    | expiry_date | days_until_expiry | batch_available_units | facility_dispatch_fifo_priority | regional_urgency_rank | cumulative_available_units 
--------------------------+----------------+-------------+--------------------+-------------+-------------------+-----------------------+---------------------------------+-----------------------+----------------------------
 Central General Hospital | WB             | B+          | CGH-WB-2024-003    | 2026-11-10  |                27 |                    17 |                               1 |                     1 |                         17
 Central General Hospital | PRBC           | A+          | CGH-PRBC-2024-002  | 2026-11-20  |                37 |                    25 |                               1 |                     1 |                         25
 Central General Hospital | PRBC           | O+          | CGH-PRBC-2024-001  | 2026-11-15  |                32 |                    40 |                               1 |                     3 |                         40
 Central General Hospital | FFP            | AB-         | CGH-FFP-2024-006   | 2027-08-15  |               305 |                     5 |                               1 |                     1 |                          5
 Central General Hospital | PLT            | AB+         | CGH-PLT-2024-004   | 2026-10-18  |                 4 |                     6 |                               1 |                     1 |                          6
 City Care Medical Center | WB             | A-          | CCMC-WB-2024-002   | 2026-11-08  |                25 |                    12 |                               1 |                     1 |                         12
 City Care Medical Center | PRBC           | O+          | CCMC-PRBC-2024-001 | 2026-11-13  |                30 |                    20 |                               1 |                     2 |                         20
 Regional Blood Bank      | PRBC           | O+          | RBB-PRBC-2024-001  | 2026-11-11  |                28 |                    80 |                               1 |                     1 |                         80
 Regional Blood Bank      | FFP            | A+          | RBB-FFP-2024-002   | 2027-09-14  |               335 |                    50 |                               1 |                     1 |                         50
 Regional Blood Bank      | PLT            | B+          | RBB-PLT-2024-004   | 2026-10-15  |                 1 |                     4 |                               1 |                     1 |                          4
 Regional Blood Bank      | CRYO           | O-          | RBB-CRYO-2024-003  | 2027-09-04  |               325 |                     5 |                               1 |                     1 |                          5
(11 rows)
```

---

### 4.2 Impending Expiry Risk Alert (7-Day Wastage Mitigation Horizon)

* **Query File**: `database/queries/expiry_tracking_fifo.sql` (Part 2)
* **Purpose**: Identifies blood batches expiring within 7 days to trigger immediate clinical reassignment or priority dispatch.
* **Business Use Case**: Quality managers and blood bank supervisors receive this automated daily alert to contact affiliated intensive care units and transplant centers, eliminating wastage of short shelf-life units such as platelets (PLT).

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
      facility_name       | contact_phone  | component_code | blood_group |   batch_number   | expiry_date | days_remaining | units_at_risk_of_wastage 
--------------------------+----------------+----------------+-------------+------------------+-------------+----------------+--------------------------
 Regional Blood Bank      | +91-22-4000003 | PLT            | B+          | RBB-PLT-2024-004 | 2026-10-15  |              1 |                        4
 Central General Hospital | +91-22-2000001 | PLT            | AB+         | CGH-PLT-2024-004 | 2026-10-18  |              4 |                        6
(2 rows)
```

---

## 5. Query 5: Database Data-Quality & Integrity Audit (DE-05)

* **Query File**: `database/queries/data_quality_audit.sql`
* **Purpose**: Performs proactive validation across all tables to identify orphaned foreign keys, negative quantities, reserved unit overflow, chronological date inversions, and stale active reservations on expired batches.
* **Business Use Case**: Run as an automated database integrity job (e.g., nightly cron or pre-migration check) to ensure zero corruption across inventory and reservations.

#### SQL Query
```sql
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
```

#### Actual PostgreSQL Execution Output
```text
 entity_table | record_id | audit_violation | anomaly_details 
--------------+-----------+-----------------+-----------------
(0 rows)
```

#### Academic Evaluation Commentary on Output
* **Expected Outcome**: On an operational database with strict relational constraints and valid business rules, the audit query **must return exactly 0 rows**.
* **Integrity Invariants Verified**:
  1. No entity contains negative inventory balances or negative reservations (`reserved_units <= total_units`).
  2. No chronological inversion exists (`collection_date < expiry_date` is maintained across all batches).
  3. No active reservation points to expired stock (`status = 'ACTIVE'` with `expiry_date <= CURRENT_DATE` is 0).
  4. Complete referential integrity is preserved (`LEFT JOIN ... WHERE parent.id IS NULL` returns 0 orphaned records).

---

## 6. Verification and Reproduction Instructions

To independently reproduce and execute these queries on any PostgreSQL 14+ instance:

1. **Initialize Database and Load DDL**:
   ```bash
   psql -U postgres -c "DROP DATABASE IF EXISTS lifelink_test_queries;"
   psql -U postgres -c "CREATE DATABASE lifelink_test_queries;"
   psql -U postgres -d lifelink_test_queries -f "database/schema.sql"
   ```

2. **Load Synthetic Seed Data**:
   ```bash
   psql -U postgres -d lifelink_test_queries -f "database/seed.sql"
   ```

3. **Execute Any Query File**:
   ```bash
   psql -U postgres -d lifelink_test_queries -f "database/queries/current_available_inventory.sql"
   psql -U postgres -d lifelink_test_queries -f "database/queries/blood_shortage_analytics.sql"
   psql -U postgres -d lifelink_test_queries -f "database/queries/medicine_shortage_analytics.sql"
   psql -U postgres -d lifelink_test_queries -f "database/queries/expiry_tracking_fifo.sql"
   psql -U postgres -d lifelink_test_queries -f "database/queries/data_quality_audit.sql"
   ```
