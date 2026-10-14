# LifeLink — PostgreSQL Integration Test Suite & Verification Report

**Project:** LifeLink (Emergency Blood & Medicine Supply Chain Platform)  
**Deliverable Type:** PostgreSQL Integration Test Documentation & Verification Evidence  
**Test Database:** `lifelink_test_integration` (PostgreSQL 14+)  
**Test Driver:** Vitest 3.2.7 with Prisma ORM 7 (`@prisma/adapter-pg`)  
**Execution Date:** October 14, 2026  
**Result:** **100% Passed (14/14 Integration Tests, 81/81 Unit Tests)**

---

## 1. Test Architecture & Separation Strategy

To ensure deterministic CI/CD pipelines, offline usability, and rock-solid production readiness, the LifeLink test architecture separates testing into two distinct layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LifeLink Test Suites                            │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. In-Memory Unit Tests (Default)│ 2. PostgreSQL Integration Tests     │
│ Command: npm test                │ Command: npm run test:integration   │
│ Driver: STORAGE_DRIVER=memory    │ Driver: STORAGE_DRIVER=postgres     │
│ DB Dependency: NONE (Isolated)   │ DB Dependency: lifelink_test_db     │
│ Target: 81 tests in 1.1s         │ Target: 14 tests in 0.6s            │
│ Focus: Validation, JWT, Edge     │ Focus: DB Constraints, Joins, ACID  │
│        Cases, Auth Escalation    │        Concurrency, Row-Level Locks │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Environment Configuration

### Integration Test Database Parameters
* **Database Host:** `localhost:5432`
* **Database Name:** `lifelink_test_integration`
* **Database User:** `bikash`
* **Connection String:** `postgresql://localhost:5432/lifelink_test_integration`
* **Driver Engine:** `@prisma/adapter-pg` pool adapter with `pg.Pool`

### Database Setup Commands
```bash
# 1. Create dedicated isolated test database
createdb lifelink_test_integration

# 2. Apply PostgreSQL DDL schema (11 tables, 9 enums, constraints)
psql -d lifelink_test_integration -f database/schema.sql

# 3. Seed initial master catalogs and synthetic test data
psql -d lifelink_test_integration -f database/seed.sql
```

---

## 3. Test Execution Commands & Verified Outputs

### 3.1 PostgreSQL Integration Test Suite (`npm run test:integration`)

**Command:**
```bash
npm --prefix server run test:integration
```

**Captured Terminal Output:**
```
> lifelink-server@0.1.0 test:integration
> STORAGE_DRIVER=postgres DATABASE_URL=postgresql://localhost:5432/lifelink_test_integration vitest run tests/integration

 RUN  v3.2.7 /Users/bikash/life link/server

 ✓ tests/integration/postgresIntegration.test.ts (14 tests) 260ms
   ✓ PostgreSQL Real Integration Suite > 1. User Repository PostgreSQL Persistence > persists a new user directly in PostgreSQL and retrieves it 59ms
   ✓ PostgreSQL Real Integration Suite > 1. User Repository PostgreSQL Persistence > re-instantiated repository retrieves the user (proving non-in-memory storage) 1ms
   ✓ PostgreSQL Real Integration Suite > 1. User Repository PostgreSQL Persistence > enforces unique email constraint at database level 38ms
   ✓ PostgreSQL Real Integration Suite > 2. Facility Management PostgreSQL Persistence > creates and persists a facility in PostgreSQL 11ms
   ✓ PostgreSQL Real Integration Suite > 2. Facility Management PostgreSQL Persistence > re-instantiated FacilityService reads facility from PostgreSQL 1ms
   ✓ PostgreSQL Real Integration Suite > 2. Facility Management PostgreSQL Persistence > updates facility details and verifies database persistence 4ms
   ✓ PostgreSQL Real Integration Suite > 3. Blood Inventory Persistence & Composite Constraints > creates a blood inventory batch and persists it in PostgreSQL 17ms
   ✓ PostgreSQL Real Integration Suite > 3. Blood Inventory Persistence & Composite Constraints > enforces composite uniqueness on (facilityId, batchNumber) 3ms
   ✓ PostgreSQL Real Integration Suite > 3. Blood Inventory Persistence & Composite Constraints > filters blood batches correctly from PostgreSQL 13ms
   ✓ PostgreSQL Real Integration Suite > 3. Blood Inventory Persistence & Composite Constraints > enforces foreign key constraint on invalid facilityId 1ms
   ✓ PostgreSQL Real Integration Suite > 4. Medicine Inventory Persistence & Catalog > creates medicine catalog item and persists in PostgreSQL 6ms
   ✓ PostgreSQL Real Integration Suite > 4. Medicine Inventory Persistence & Catalog > creates medicine batch and persists in PostgreSQL 11ms
   ✓ PostgreSQL Real Integration Suite > 4. Medicine Inventory Persistence & Catalog > enforces composite uniqueness on (facilityId, medicineId, batchNumber) 1ms
   ✓ PostgreSQL Real Integration Suite > 5. ACID Concurrent Reservation Safety (Pessimistic Row Locking) > prevents over-reservation under high concurrency via PostgreSQL transactions & FOR UPDATE locks 18ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  09:19:41
   Duration  566ms (transform 78ms, setup 0ms, collect 141ms, tests 260ms, environment 0ms, prepare 47ms)
```

---

### 3.2 Standard Unit Test Suite (`npm test`)

**Command:**
```bash
npm --prefix server test
```

**Captured Terminal Output:**
```
> lifelink-server@0.1.0 test
> vitest run --exclude 'tests/integration/**'

 RUN  v3.2.7 /Users/bikash/life link/server

 ✓ tests/health.test.ts (2 tests) 21ms
 ✓ tests/authSecurity.test.ts (8 tests) 49ms
 ✓ tests/medicineInventory.test.ts (11 tests) 97ms
 ✓ tests/reservationSafety.test.ts (6 tests) 136ms
 ✓ tests/facility.test.ts (24 tests) 144ms
 ✓ tests/bloodInventory.test.ts (16 tests) 173ms
 ✓ tests/auth.test.ts (14 tests) 535ms

 Test Files  7 passed (7)
      Tests  81 passed (81)
   Start at  09:19:39
   Duration  1.46s (transform 551ms, setup 0ms, collect 4.95s, tests 1.15s, environment 1ms, prepare 489ms)
```

---

### 3.3 TypeScript Validation & Compilation

**Commands:**
```bash
npm --prefix server run typecheck
npm --prefix server run build
```

**Captured Terminal Output:**
```
> lifelink-server@0.1.0 typecheck
> tsc --noEmit

[Exit Code 0 — Zero Type Errors]

> lifelink-server@0.1.0 build
> tsc

[Exit Code 0 — Build Succeeded]
```

---

## 4. Detailed Test Case Analysis & Verification Proof

### Test Suite 1: User Persistence & Identity Verification
1. **Direct PostgreSQL Insertion & Querying:**
   - Evaluates `userRepository.create(...)`.
   - Confirms user creation by issuing a raw PostgreSQL query `SELECT id, email, full_name FROM users WHERE id = ...`.
   - Result: Record exists in PostgreSQL table `users` with hashed password and role `USER`.
2. **Process Restart & Memory Simulation:**
   - Creates a new instance: `const freshRepo = new PrismaUserRepository()`.
   - Fetches the user by email from the fresh instance.
   - Result: Successful retrieval proves data resides permanently in PostgreSQL, not in volatile in-memory Maps.
3. **Database-Level Unique Constraint Enforcement:**
   - Attempts to insert a duplicate user with the identical email.
   - Result: Rejected by PostgreSQL unique constraint `users_email_key` with Prisma error `P2002`.

### Test Suite 2: Facility Management Persistence
4. **Facility Creation & Verification:**
   - Creates facility `Test Hospital` with geo-coordinates `(27.7172, 85.3240)` and city `Kathmandu`.
   - Issues raw query `SELECT id, name, city FROM facilities WHERE id = ...`.
   - Result: Row exists with exact latitude/longitude decimals and `is_verified` boolean.
5. **Fresh Service Instance Check:**
   - Instantiates `new FacilityService()`.
   - Retrieves facility by ID from the database.
6. **Facility Mutation & Persistence:**
   - Updates `contactPhone` to `+977-1-9999999`.
   - Verifies via SQL query `SELECT contact_phone FROM facilities WHERE id = ...` that the change is committed.

### Test Suite 3: Blood Inventory & Composite Uniqueness
7. **Blood Batch Creation:**
   - Inserts batch `BLD-PG-...` of 25 units of `B+` blood component.
   - Confirms insertion directly via SQL: `SELECT blood_group::text, total_units FROM blood_inventory`.
8. **Composite Uniqueness Guarantee:**
   - Attempts to create a duplicate batch with the same `(facilityId, batchNumber)`.
   - Result: PostgreSQL rejects the operation via unique constraint `uq_facility_blood_batch`.
9. **Multi-Column Filtering & Relational Joins:**
   - Executes `listBloodInventory({ facilityId, bloodGroup: 'B+', availableOnly: true })`.
   - Confirms correct join on `facilities` and `blood_components` tables with accurate stock counts.
10. **Foreign Key Integrity:**
    - Attempts to create a batch with non-existent `facilityId: 00000000-0000-0000-0000-000000000000`.
    - Result: Operation fails immediately with foreign key constraint violation.

### Test Suite 4: Medicine Catalog & Inventory
11. **Master Catalog Creation:**
    - Inserts `Paracetamol` with generic name `Acetaminophen`, dosage `TABLET`, strength `500mg`.
    - Verifies presence in PostgreSQL table `medicines`.
12. **Medicine Batch Persistence:**
    - Inserts batch `MED-PG-...` of 100 units linked to facility and medicine ID.
    - Verified in PostgreSQL table `medicine_inventory`.
13. **Medicine Composite Uniqueness:**
    - Duplicate insertion on `(facilityId, medicineId, batchNumber)` is rejected via `uq_facility_med_batch`.

### Test Suite 5: ACID Concurrent Reservation Safety (Pessimistic Locking)
14. **High-Concurrency Race Condition Test:**
    - **Initial State:** Batch created with `totalUnits = 10`, `reservedUnits = 0`, `availableUnits = 10`.
    - **Concurrent Workload:** 5 simultaneous reservation requests of 3 units each fired concurrently via `Promise.allSettled`.
    - **Theoretical Demand:** 15 units demanded; only 10 units available.
    - **Mechanism:** Each transaction acquires a row-level pessimistic lock:
      ```sql
      SELECT id, total_units, reserved_units, expiry_date, status, batch_number 
      FROM blood_inventory 
      WHERE id = $1::uuid 
      FOR UPDATE;
      ```
    - **Observed Result:**
      * Exactly **3 requests fulfilled** (reserving 3 * 3 = 9 units).
      * Exactly **2 requests rejected** with `Insufficient available stock for batch '...' (Requested: 3, Available: 1)`.
      * Direct PostgreSQL query confirms `total_units = 10`, `reserved_units = 9`.
      * Check constraint `reserved_units <= total_units` was never violated.
    - **Release Verification:**
      * Stock release called for 6 units.
      * Direct PostgreSQL query confirms `reserved_units` decreased to exactly 3.

---

## 5. Summary & Instructions for Evaluators

To replicate the complete test run independently on any developer workstation:

```bash
# 1. Run unit test suite
npm --prefix server test

# 2. Run real PostgreSQL integration tests
npm --prefix server run test:integration

# 3. Verify TypeScript typings
npm --prefix server run typecheck

# 4. Build backend bundle
npm --prefix server run build
```
