# LifeLink — Entity Relationship Diagram

> **Source of truth:** `server/prisma/schema.prisma` and `database/schema.sql`
>
> **Database:** PostgreSQL 14+ · **ORM:** Prisma · **Schema Normal Form:** 3NF

## ER Diagram (Mermaid)

```mermaid
erDiagram

    %% ===========================
    %% ENTITY DEFINITIONS
    %% ===========================

    users {
        UUID id PK
        VARCHAR email UK "UNIQUE"
        VARCHAR password_hash
        VARCHAR full_name
        VARCHAR phone
        user_role role "DEFAULT USER"
        UUID facility_id FK "nullable → facilities"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    facilities {
        UUID id PK
        VARCHAR name
        facility_type facility_type
        VARCHAR address
        VARCHAR city
        VARCHAR state
        VARCHAR postal_code "nullable"
        NUMERIC latitude "nullable DECIMAL(10,7)"
        NUMERIC longitude "nullable DECIMAL(10,7)"
        VARCHAR contact_phone
        VARCHAR contact_email "nullable"
        JSONB operating_hours "nullable"
        BOOLEAN is_verified "DEFAULT FALSE"
        UUID manager_user_id FK "nullable → users"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    blood_components {
        UUID id PK
        VARCHAR code UK "UNIQUE"
        VARCHAR name
        INT default_shelf_life_days
        VARCHAR storage_temp_celsius
        TEXT description "nullable"
        TIMESTAMPTZ created_at
    }

    blood_inventory {
        UUID id PK
        UUID facility_id FK "→ facilities ON DELETE CASCADE"
        UUID component_id FK "→ blood_components ON DELETE RESTRICT"
        blood_group blood_group
        VARCHAR batch_number "UNIQUE(facility_id, batch_number)"
        INT total_units "DEFAULT 0"
        INT reserved_units "DEFAULT 0"
        DATE collection_date
        DATE expiry_date "CHECK > collection_date"
        VARCHAR storage_location "nullable"
        inventory_status status "DEFAULT AVAILABLE"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    medicines {
        UUID id PK
        VARCHAR name
        VARCHAR generic_name
        dosage_form dosage_form
        VARCHAR strength
        VARCHAR manufacturer "nullable"
        VARCHAR category "nullable"
        TEXT description "nullable"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    medicine_inventory {
        UUID id PK
        UUID facility_id FK "→ facilities ON DELETE CASCADE"
        UUID medicine_id FK "→ medicines ON DELETE RESTRICT"
        VARCHAR batch_number "UNIQUE(facility_id, medicine_id, batch_number)"
        INT total_units "DEFAULT 0"
        INT reserved_units "DEFAULT 0"
        DATE expiry_date
        VARCHAR storage_location "nullable"
        inventory_status status "DEFAULT AVAILABLE"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    requests {
        UUID id PK
        VARCHAR request_number UK "UNIQUE"
        UUID requester_id FK "→ users ON DELETE RESTRICT"
        UUID facility_id FK "→ facilities ON DELETE RESTRICT"
        request_type request_type
        urgency_level urgency "DEFAULT NORMAL"
        request_status status "DEFAULT PENDING"
        TEXT clinical_notes "nullable"
        TIMESTAMPTZ expires_at "nullable"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    request_items {
        UUID id PK
        UUID request_id FK "→ requests ON DELETE CASCADE"
        UUID blood_component_id FK "nullable → blood_components"
        blood_group blood_group "nullable"
        UUID medicine_id FK "nullable → medicines"
        INT quantity_requested "CHECK > 0"
        INT quantity_reserved "DEFAULT 0"
        INT quantity_fulfilled "DEFAULT 0"
    }

    inventory_reservations {
        UUID id PK
        UUID request_item_id FK "→ request_items ON DELETE CASCADE"
        UUID blood_inventory_id FK "nullable → blood_inventory"
        UUID medicine_inventory_id FK "nullable → medicine_inventory"
        INT reserved_quantity "CHECK > 0"
        reservation_status status "DEFAULT ACTIVE"
        TIMESTAMPTZ expires_at "nullable"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ released_at "nullable"
    }

    request_status_history {
        UUID id PK
        UUID request_id FK "→ requests ON DELETE CASCADE"
        VARCHAR from_status "nullable"
        VARCHAR to_status
        UUID changed_by_user_id FK "nullable → users"
        TEXT notes "nullable"
        TIMESTAMPTZ created_at
    }

    audit_logs {
        UUID id PK
        VARCHAR entity_type "polymorphic target"
        UUID entity_id "polymorphic target"
        UUID actor_id FK "nullable → users"
        VARCHAR action
        JSONB details "nullable"
        TIMESTAMPTZ created_at
    }

    %% ===========================
    %% RELATIONSHIPS
    %% ===========================

    %% User ↔ Facility (staff assignment) — N:1
    users }o--o| facilities : "staff works at (facility_id)"

    %% Facility → User (manager) — N:1
    facilities }o--o| users : "managed by (manager_user_id)"

    %% BloodInventory → Facility — N:1
    blood_inventory }o--|| facilities : "stored at (facility_id)"

    %% BloodInventory → BloodComponent — N:1
    blood_inventory }o--|| blood_components : "is type (component_id)"

    %% MedicineInventory → Facility — N:1
    medicine_inventory }o--|| facilities : "stored at (facility_id)"

    %% MedicineInventory → Medicine — N:1
    medicine_inventory }o--|| medicines : "is type (medicine_id)"

    %% Request → User (requester) — N:1
    requests }o--|| users : "placed by (requester_id)"

    %% Request → Facility — N:1
    requests }o--|| facilities : "directed to (facility_id)"

    %% RequestItem → Request — N:1
    request_items }o--|| requests : "belongs to (request_id)"

    %% RequestItem → BloodComponent (optional) — N:0..1
    request_items }o--o| blood_components : "requests (blood_component_id)"

    %% RequestItem → Medicine (optional) — N:0..1
    request_items }o--o| medicines : "requests (medicine_id)"

    %% InventoryReservation → RequestItem — N:1
    inventory_reservations }o--|| request_items : "reserves for (request_item_id)"

    %% InventoryReservation → BloodInventory (optional) — N:0..1
    inventory_reservations }o--o| blood_inventory : "holds (blood_inventory_id)"

    %% InventoryReservation → MedicineInventory (optional) — N:0..1
    inventory_reservations }o--o| medicine_inventory : "holds (medicine_inventory_id)"

    %% RequestStatusHistory → Request — N:1
    request_status_history }o--|| requests : "tracks (request_id)"

    %% RequestStatusHistory → User (actor, optional) — N:0..1
    request_status_history }o--o| users : "changed by (changed_by_user_id)"

    %% AuditLog → User (actor, optional) — N:0..1
    audit_logs }o--o| users : "performed by (actor_id)"
```

## Entity Summary

| # | Table (PostgreSQL) | Prisma Model | Columns | PK | FKs | Description |
|---|---|---|---|---|---|---|
| 1 | `users` | `User` | 8 | `id` | `facility_id` → facilities | Registered users (donors, staff, admins) |
| 2 | `facilities` | `Facility` | 14 | `id` | `manager_user_id` → users | Hospitals, blood banks, pharmacies |
| 3 | `blood_components` | `BloodComponent` | 6 | `id` | — | Master catalog: Whole Blood, RBC, Plasma, etc. |
| 4 | `blood_inventory` | `BloodInventory` | 12 | `id` | `facility_id` → facilities, `component_id` → blood_components | Blood batch stock per facility |
| 5 | `medicines` | `Medicine` | 9 | `id` | — | Master catalog of medicines (3NF) |
| 6 | `medicine_inventory` | `MedicineInventory` | 10 | `id` | `facility_id` → facilities, `medicine_id` → medicines | Medicine batch stock per facility |
| 7 | `requests` | `Request` | 10 | `id` | `requester_id` → users, `facility_id` → facilities | Blood/medicine requests from users |
| 8 | `request_items` | `RequestItem` | 7 | `id` | `request_id` → requests, `blood_component_id` → blood_components, `medicine_id` → medicines | Line items within a request |
| 9 | `inventory_reservations` | `InventoryReservation` | 8 | `id` | `request_item_id` → request_items, `blood_inventory_id` → blood_inventory, `medicine_inventory_id` → medicine_inventory | Holds placed on inventory batches |
| 10 | `request_status_history` | `RequestStatusHistory` | 6 | `id` | `request_id` → requests, `changed_by_user_id` → users | Audit trail of request status transitions |
| 11 | `audit_logs` | `AuditLog` | 6 | `id` | `actor_id` → users | Polymorphic activity log |

## Relationship Summary

| # | From | To | FK Column | Cardinality | ON DELETE |
|---|---|---|---|---|---|
| 1 | `users` | `facilities` | `facility_id` | N : 0..1 | SET NULL |
| 2 | `facilities` | `users` | `manager_user_id` | N : 0..1 | SET NULL |
| 3 | `blood_inventory` | `facilities` | `facility_id` | N : 1 | CASCADE |
| 4 | `blood_inventory` | `blood_components` | `component_id` | N : 1 | RESTRICT |
| 5 | `medicine_inventory` | `facilities` | `facility_id` | N : 1 | CASCADE |
| 6 | `medicine_inventory` | `medicines` | `medicine_id` | N : 1 | RESTRICT |
| 7 | `requests` | `users` | `requester_id` | N : 1 | RESTRICT |
| 8 | `requests` | `facilities` | `facility_id` | N : 1 | RESTRICT |
| 9 | `request_items` | `requests` | `request_id` | N : 1 | CASCADE |
| 10 | `request_items` | `blood_components` | `blood_component_id` | N : 0..1 | RESTRICT |
| 11 | `request_items` | `medicines` | `medicine_id` | N : 0..1 | RESTRICT |
| 12 | `inventory_reservations` | `request_items` | `request_item_id` | N : 1 | CASCADE |
| 13 | `inventory_reservations` | `blood_inventory` | `blood_inventory_id` | N : 0..1 | SET NULL |
| 14 | `inventory_reservations` | `medicine_inventory` | `medicine_inventory_id` | N : 0..1 | SET NULL |
| 15 | `request_status_history` | `requests` | `request_id` | N : 1 | CASCADE |
| 16 | `request_status_history` | `users` | `changed_by_user_id` | N : 0..1 | SET NULL |
| 17 | `audit_logs` | `users` | `actor_id` | N : 0..1 | SET NULL |

## Enums

| Enum | Values |
|---|---|
| `user_role` | USER, FACILITY_STAFF, ADMIN |
| `facility_type` | HOSPITAL, BLOOD_BANK, PHARMACY |
| `blood_group` | A+, A−, B+, B−, AB+, AB−, O+, O− |
| `inventory_status` | AVAILABLE, RESERVED, EXPIRED, QUARANTINED |
| `dosage_form` | TABLET, CAPSULE, INJECTION, SYRUP, VIAL, IV_INFUSION |
| `request_type` | BLOOD, MEDICINE |
| `urgency_level` | NORMAL, URGENT, CRITICAL |
| `request_status` | PENDING, RESERVED, PARTIALLY_FULFILLED, FULFILLED, CANCELLED, EXPIRED |
| `reservation_status` | ACTIVE, CONFIRMED, RELEASED, EXPIRED |

## Unique Constraints

| Table | Constraint | Columns |
|---|---|---|
| `users` | Unique | `email` |
| `blood_components` | Unique | `code` |
| `blood_inventory` | Composite Unique | `(facility_id, batch_number)` |
| `medicine_inventory` | Composite Unique | `(facility_id, medicine_id, batch_number)` |
| `requests` | Unique | `request_number` |

## CHECK Constraints

| Table | Constraint |
|---|---|
| `blood_inventory` | `expiry_date > collection_date` |
| `blood_inventory` | `reserved_units >= 0 AND reserved_units <= total_units` |
| `medicine_inventory` | `reserved_units >= 0 AND reserved_units <= total_units` |
| `request_items` | Exactly one of `blood_component_id` or `medicine_id` must be non-null |
| `inventory_reservations` | Exactly one of `blood_inventory_id` or `medicine_inventory_id` must be non-null |
| `facilities` | `latitude BETWEEN -90 AND 90`, `longitude BETWEEN -180 AND 180` |
