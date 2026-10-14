# LifeLink — PostgreSQL Integration Audit

**Project:** LifeLink (Healthcare Emergency Blood & Medicine Supply Chain Platform)  
**Deliverable Type:** Database Integration & Persistence Audit  
**Target Environment:** PostgreSQL 14+ / Prisma ORM 7  
**Date of Audit:** October 14, 2026  
**Status:** Validated & Functionally Active

---

## 1. Executive Summary

A comprehensive architectural audit of the LifeLink backend was conducted to transition the system from development in-memory mock repositories to a production-grade, relational PostgreSQL persistence layer managed via Prisma ORM.

### Initial State vs. Target State
* **Initial Implementation:** Core services (`user.repository.ts`, `facility.service.ts`, `inventory.service.ts`) originally stored data in memory using static JavaScript `Map<string, T>` instances. While this enabled fast, zero-dependency unit tests, data was lost on process restarts, transactions lacked ACID guarantees, and database constraints were not enforced at the storage engine level.
* **Target Architecture:** A dual-driver persistence pattern (`STORAGE_DRIVER=postgres`) allowing the backend to run in two distinct, deterministic modes:
  1. **In-Memory Mode (`default`):** Fast, isolated, zero-dependency execution for unit test suites and offline local development (81 unit tests passing in ~1.1s).
  2. **PostgreSQL Mode (`STORAGE_DRIVER=postgres`):** Full relational persistence, foreign key enforcement, database-level unique constraints, and ACID transactions with pessimistic row locking (`SELECT ... FOR UPDATE`) executing against real PostgreSQL instances.

---

## 2. Component-by-Component Persistence Audit

| Feature Area | Storage Driver | In-Memory Fallback | Persistence Mechanism | Concurrency / ACID Safeguards | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Authentication** | PostgreSQL (`users` table) | `InMemoryUserRepository` | `PrismaUserRepository` via `SwitchableUserRepository` | Unique index `users_email_key` (`P2002`) | **Production Ready** |
| **Facility Management** | PostgreSQL (`facilities` table) | `FacilityService.facilitiesStore` | Prisma CRUD in `FacilityService` | Cascading relations, JSON operating hours | **Production Ready** |
| **Blood Inventory** | PostgreSQL (`blood_inventory` table) | `InventoryService.bloodInventoryStore` | Prisma CRUD with enum mapping | Composite unique key `uq_facility_blood_batch` | **Production Ready** |
| **Medicine Catalog** | PostgreSQL (`medicines` table) | `InventoryService.medicinesStore` | Prisma CRUD in `InventoryService` | Unique generic name / dosage form | **Production Ready** |
| **Medicine Inventory** | PostgreSQL (`medicine_inventory` table) | `InventoryService.medicineInventoryStore` | Prisma CRUD in `InventoryService` | Composite unique key `uq_facility_med_batch` | **Production Ready** |
| **Stock Reservations** | PostgreSQL (`blood_inventory`, `medicine_inventory`) | `InventoryService.reservationsStore` | `$transaction` + `AuditLog` | Pessimistic Row Locking (`FOR UPDATE`) | **Production Ready** |
| **Emergency Requests** | In-Memory (Schema modeled in DB) | Route mock handlers | Schema ready (`requests`, `request_items`) | Relational foreign keys to users/facilities | **Phase 2 Scope** |

### Detailed Findings by Module

### 2.1 User Authentication & Registration
* **Repository Architecture:** Implemented `server/src/repositories/prismaUser.repository.ts` implementing `IUserRepository`.
* **Switchable Delegation:** `server/src/repositories/user.repository.ts` delegates to `PrismaUserRepository` whenever `process.env.STORAGE_DRIVER === 'postgres'`.
* **Database Verification:** User insertion writes directly to table `users`. Passwords remain securely salted and hashed via scrypt with 64-byte outputs. Uniqueness of email is strictly enforced by PostgreSQL (`users_email_key`).

### 2.2 Facility Management
* **Service Architecture:** `FacilityService` natively branches on `FacilityService.isPostgres()`.
* **Features Persisted:** Facility name, facility type (`HOSPITAL`, `BLOOD_BANK`, `PHARMACY`), physical address, geographic coordinates (`latitude`, `longitude` as decimals), contact information, verification status, and JSON-structured operating hours.
* **Relations:** Foreign key relation `manager_user_id` mapped to `users(id)`.

### 2.3 Blood Inventory Operations
* **Service Architecture:** `InventoryService` supports blood batch creation, querying, listing, and updates directly against table `blood_inventory`.
* **Composite Uniqueness:** Enforced at both the database level (`uq_facility_blood_batch`) and Prisma level: a facility cannot possess duplicate batch numbers.
* **Date & Expiry Logic:** `expiry_date` is checked against current server timestamps; batches past their expiry are automatically categorized as `EXPIRED` and subtracted from available units.
* **Relational Joins:** Queries include relations to `facilities` and `blood_components` (`code`, `name`, `storageTempCelsius`).

### 2.4 Medicine Catalog & Medicine Inventory
* **Master Catalog:** Master medicines are persisted in the `medicines` table with generic names, dosage forms, and strengths.
* **Batch Inventory:** Batches are persisted in table `medicine_inventory` linked to both `facilities` and `medicines`.
* **Composite Uniqueness:** Enforced via `uq_facility_med_batch` across `(facility_id, medicine_id, batch_number)`.

### 2.5 Stock Reservation & Concurrency Safety
* **ACID Transactions:** `reserveBloodStock` and `reserveMedicineStock` execute within `prisma.$transaction`.
* **Pessimistic Row-Level Locking:** Rather than standard dirty reads that can lead to race conditions under heavy traffic, the service executes `SELECT ... FOR UPDATE` via raw transaction queries. This serializes concurrent reservation attempts on the same inventory batch.
* **Check Constraints:** PostgreSQL table check constraints (`reserved_units >= 0 AND reserved_units <= total_units`) provide hardware-level guarantees against negative or over-reserved inventory.

---

## 3. Schema Alignment & Divergence Analysis

A rigorous cross-check was executed between `database/schema.sql` (the DDL baseline) and `server/prisma/schema.prisma`.

### 3.1 Divergence Identified & Fixed: PostgreSQL Enum Names
* **Finding:** In PostgreSQL, enum types created in `database/schema.sql` were lowercase `snake_case` (e.g. `user_role`, `facility_type`, `blood_group`, `inventory_status`, `dosage_form`, `request_type`, `urgency_level`, `request_status`, `reservation_status`).
* **Root Cause:** Prisma 7 by default queries the PostgreSQL catalogue for uppercase PascalCase enum types (`"UserRole"`, `"FacilityType"`), resulting in PostgreSQL error `42704: type "public.FacilityType" does not exist`.
* **Resolution Applied:** Annotated all enums in `server/prisma/schema.prisma` with `@@map("...")` directives to map PascalCase Prisma enums to snake_case PostgreSQL types:
  ```prisma
  enum UserRole {
    USER
    FACILITY_STAFF
    ADMIN
    @@map("user_role")
  }

  enum FacilityType {
    HOSPITAL
    BLOOD_BANK
    PHARMACY
    @@map("facility_type")
  }

  enum BloodGroup {
    A_POS  @map("A+")
    A_NEG  @map("A-")
    B_POS  @map("B+")
    B_NEG  @map("B-")
    AB_POS @map("AB+")
    AB_NEG @map("AB-")
    O_POS  @map("O+")
    O_NEG  @map("O-")
    @@map("blood_group")
  }
  ```

### 3.2 Prisma 7 Driver Adapter Architecture
* **Finding:** Prisma 7 deprecated direct URL-based engine connections in Node.js runtime environments without a designated adapter. Direct calls threw `PrismaClientInitializationError`.
* **Resolution Applied:** Integrated `@prisma/adapter-pg` backed by a shared `pg.Pool` in `server/src/db/prisma.ts`. Connection pooling is configured cleanly with centralized disconnect hooks.

---

## 4. Concurrency & ACID Integrity Analysis

### The Over-Reservation Vulnerability (In-Memory vs. Naive Prisma vs. Row Locking)
1. **In-Memory (Single Thread):** JavaScript's single-threaded event loop processes requests sequentially, preventing memory corruption but lacking persistence across restarts or multiple worker processes.
2. **Naive Prisma Transaction:** A standard `findUnique` inside `$transaction` executes at `Read Committed` isolation level. Under concurrent bursts (e.g. 5 hospitals requesting blood from the same 10-unit batch simultaneously), multiple transactions read available stock as 10 before any transaction updates `reserved_units`, leading to severe inventory over-allocation.
3. **Pessimistic Row-Level Locking (`FOR UPDATE`):**
   ```sql
   SELECT id, total_units, reserved_units, expiry_date, status, batch_number 
   FROM blood_inventory 
   WHERE id = $1::uuid 
   FOR UPDATE;
   ```
   * The first transaction locks the specific batch row.
   * Subsequent transactions are placed in wait-state.
   * When each transaction unblocks, it reads the updated `reserved_units` value.
   * If available stock is depleted, the transaction safely throws `BadRequestError: Insufficient available stock` and rolls back without touching inventory.

---

## 5. Summary of Completed vs. Remaining Work

### Implemented & Verified in PostgreSQL
* [x] Database connection pooling via `@prisma/adapter-pg` and `pg`.
* [x] User repository persistence and email uniqueness (`users` table).
* [x] Facility management CRUD and geographic coordinate storage (`facilities` table).
* [x] Blood inventory batch operations, joins, and composite keys (`blood_inventory`).
* [x] Medicine catalog and batch operations (`medicines`, `medicine_inventory`).
* [x] ACID stock reservation and stock release with pessimistic row locks (`FOR UPDATE`).
* [x] Dedicated test integration database (`lifelink_test_integration`) seeded with synthetic data.
* [x] 14 real PostgreSQL integration tests (`npm run test:integration`).
* [x] 81 unit tests passing with in-memory isolation (`npm test`).

### Remaining Work (Planned for Subsequent Scope)
* **Emergency Request Workflow Engine:** Tables `requests`, `request_items`, and `request_status_history` are fully modeled and validated in PostgreSQL schema and SQL analytics queries, but the HTTP Express route handlers currently use mock endpoints. Full Prisma migration of the requisition state machine is prioritized for Phase 2.
