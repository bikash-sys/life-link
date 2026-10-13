# LifeLink Academic Project Scope & Evaluation Proposals

> **Status:** PROPOSED (Pending Course Instructor Review & Final Sign-Off)  
> **Course Tracks:** AP (Application Project — 10 Marks) & DE (Database Engineering — 9 Marks)  
> **Target Branch:** `main` (Single-Branch Two-Developer Workflow)

---

## 1. AP (Application Project — 10 Marks) Scope Checklist

The Application Project evaluation focuses on software architecture, clean separation of concerns, API correctness, end-to-end functionality, automated testing, and team collaboration.

| ID | Module / Deliverable | Measurable Acceptance Criteria | Weight | Owner |
|---|---|---|---|---|
| **AP-01** | **Monorepo Foundation & Express Core** | Modular Express + TypeScript architecture (`routes/controllers/services/middleware`), centralized error handler, typed environment config, CORS configuration. | 10% | Shared |
| **AP-02** | **Authentication & Role-Based Access (RBAC)** | JWT authentication with hashed passwords (bcrypt/Argon2); role guards for `USER`, `FACILITY_STAFF`, and `ADMIN`; protected route middleware. | 12% | Developer A |
| **AP-03** | **Zod Validation & OpenAPI / Swagger Docs** | Strict runtime validation schemas for all request payloads/queries using Zod; self-documenting Swagger UI at `/api-docs`. | 8% | Shared |
| **AP-04** | **Blood Compatibility & Matching Engine** | Algorithmic matching for ABO / Rh (+/-) blood groups across whole blood, packed red cells, and fresh frozen plasma; 100% unit test coverage. | 10% | Developer A |
| **AP-05** | **Multi-Criteria Search & Proximity** | REST API for filtering blood components and essential medicines by location/city, urgency, with optional Haversine distance ranking. | 10% | Developer A |
| **AP-06** | **Request & Reservation Workflow** | End-to-end requisition lifecycle (`PENDING` -> `RESERVED` -> `FULFILLED` / `CANCELLED` / `EXPIRED`) with status tracking API and UI views. | 12% | Developer A |
| **AP-07** | **Facility Management Module** | Facility profile management, facility verification status, operating schedules, contact endpoints, and geolocation metadata. | 10% | Developer B |
| **AP-08** | **Blood & Medicine Inventory APIs** | Batch-level inventory management with unit metrics, dosage strength, storage rules, and automatic exclusion of expired units from available counts. | 10% | Developer B |
| **AP-09** | **Atomic Inventory Reservations** | ACID transaction implementation preventing race conditions or double-booking when allocating stock under concurrent user requests. | 8% | Developer B |
| **AP-10** | **Automated Testing & Code Quality** | Vitest and Supertest integration tests for backend APIs; React Testing Library component tests; minimum 25 passing test cases. | 10% | Shared |
| **Total** | | | **100%** | |

---

## 2. DE (Database Engineering — 9 Marks) Scope Checklist

The Database Engineering evaluation focuses on relational database modeling, normalization, constraints, synthetic data generation, data audits, and advanced analytical SQL queries.

| ID | Module / Deliverable | Measurable Acceptance Criteria | Weight | Owner |
|---|---|---|---|---|
| **DE-01** | **ER Diagram & 3NF Relational Schema** | Entity-Relationship diagram and DDL conforming to Third Normal Form (3NF); primary keys, foreign keys, and referential integrity actions. | 12% | Developer B |
| **DE-02** | **Integrity Constraints & Enums** | Explicit SQL domain constraints: `CHECK` constraints on inventory counts $(\ge 0)$, collection vs. expiry dates, enum blood groups, not-null constraints. | 10% | Developer B |
| **DE-03** | **Reproducible Migrations & DDL Scripts** | Clean standalone SQL migration scripts (`schema.sql`) runnable reproducibly on any local or cloud PostgreSQL instance. | 10% | Developer B |
| **DE-04** | **Synthetic Dataset Generation** | Plausible, zero-PII synthetic dataset (at least 20 facilities, 200+ inventory units, 50+ requests) generated via reproducible seed scripts. | 10% | Developer B |
| **DE-05** | **Data-Quality & Audit Scripts** | Standalone SQL audit scripts verifying zero orphan foreign keys, non-negative balances, and absence of expired active reservations. | 10% | Developer B |
| **DE-06** | **Multi-Table Joins & Search Queries** | Relational queries joining facilities, inventory, request items, and audit logs with conditional filtering and grouping. | 10% | Developer A |
| **DE-07** | **Shortage & Stock Aggregation Queries** | SQL aggregation queries computing critical inventory thresholds per city/region and flagging impending shortages. | 12% | Developer B |
| **DE-08** | **Expiry Tracking via Window Functions** | Advanced SQL queries using window functions (`ROW_NUMBER()`, `RANK()`, `SUM() OVER PARTITION BY`) to track batch expiration order (FIFO). | 12% | Developer B |
| **DE-09** | **Indexing & Query Performance** | B-Tree indices on frequent filter columns (`facility_id`, `blood_group`, `status`, `expiry_date`) verified with `EXPLAIN ANALYZE`. | 6% | Developer A |
| **DE-10** | **Database Engineering Documentation** | Academic report detailing schema design decisions, normalization proofs, query performance benchmarks, and viva defense notes. | 8% | Shared |
| **Total** | | | **100%** | |

---

## 3. Academic Viva & Collaboration Strategy

1. **Individual Accountability:** Every commit message attributes specific modules to the respective developer's Git identity.
2. **Comprehensive Understanding:** Both Developer A and Developer B will participate in pair design reviews so that both developers can explain the entire architecture during individual viva examinations.
