# LifeLink — Preliminary Entity-Relationship Diagram (DRAFT)

> **NOTICE: DRAFT DESIGN — SUBJECT TO DATA MODEL REVIEW**  
> *This document contains the proposed initial relational model for LifeLink. It serves as a discussion draft for peer and instructor review before migrations and database schemas are finalized.*

---

## 1. Entity-Relationship Overview (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ REQUESTS : "places"
    USERS }o--o| FACILITIES : "manages/staffs"
    FACILITIES ||--o{ BLOOD_INVENTORY : "stocks"
    FACILITIES ||--o{ MEDICINE_INVENTORY : "stocks"
    FACILITIES ||--o{ REQUESTS : "fulfills"
    BLOOD_INVENTORY ||--o{ REQUEST_ITEMS : "allocated_to"
    MEDICINE_INVENTORY ||--o{ REQUEST_ITEMS : "allocated_to"
    REQUESTS ||--o{ REQUEST_ITEMS : "contains"
    REQUESTS ||--o{ AUDIT_LOGS : "generates"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        string role "USER | FACILITY_STAFF | ADMIN"
        timestamp created_at
        timestamp updated_at
    }

    FACILITIES {
        uuid id PK
        string name
        string facility_type "HOSPITAL | BLOOD_BANK | PHARMACY"
        string address
        string city
        string state
        decimal latitude
        decimal longitude
        string contact_phone
        boolean is_verified
        uuid manager_user_id FK "nullable"
        timestamp created_at
    }

    BLOOD_INVENTORY {
        uuid id PK
        uuid facility_id FK
        string blood_group "A+ | A- | B+ | B- | AB+ | AB- | O+ | O-"
        string component_type "WHOLE_BLOOD | PRBC | PLATELETS | FFP"
        string batch_number UK
        int units_available "CHECK >= 0"
        int units_reserved "CHECK >= 0"
        date collection_date
        date expiry_date "CHECK > collection_date"
        string storage_location
        string status "AVAILABLE | RESERVED | EXPIRED | QUARANTINED"
        timestamp created_at
    }

    MEDICINE_INVENTORY {
        uuid id PK
        uuid facility_id FK
        string medicine_name
        string generic_name
        string dosage_form "TABLET | INJECTION | SYRUP | VIAL"
        string strength
        string batch_number
        int units_available "CHECK >= 0"
        int units_reserved "CHECK >= 0"
        date expiry_date
        string manufacturer
        string status "AVAILABLE | RESERVED | EXPIRED"
        timestamp created_at
    }

    REQUESTS {
        uuid id PK
        uuid requester_id FK
        uuid facility_id FK
        string request_type "BLOOD | MEDICINE"
        string urgency "NORMAL | URGENT | CRITICAL"
        string status "PENDING | RESERVED | FULFILLED | CANCELLED | EXPIRED"
        text clinical_notes
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    REQUEST_ITEMS {
        uuid id PK
        uuid request_id FK
        uuid blood_inventory_id FK "nullable"
        uuid medicine_inventory_id FK "nullable"
        int quantity_requested "CHECK > 0"
        int quantity_reserved "CHECK >= 0"
    }

    AUDIT_LOGS {
        uuid id PK
        uuid request_id FK
        uuid actor_id FK
        string action
        jsonb details
        timestamp created_at
    }
```

---

## 2. Entity Descriptions & Keys

### `USERS`
- **Primary Key:** `id` (UUIDv4)
- **Alternate Key:** `email` (Unique)
- **Purpose:** Central user registry supporting role-based access control.

### `FACILITIES`
- **Primary Key:** `id` (UUIDv4)
- **Foreign Key:** `manager_user_id` $\to$ `USERS(id)`
- **Purpose:** Stores verified institutions (Hospitals, Blood Banks, Pharmacies) with geographic coordinates for distance calculation.

### `BLOOD_INVENTORY`
- **Primary Key:** `id` (UUIDv4)
- **Foreign Key:** `facility_id` $\to$ `FACILITIES(id)`
- **Integrity Constraints:**
  - `CHECK (units_available >= 0)`
  - `CHECK (units_reserved >= 0)`
  - `CHECK (units_reserved <= units_available)`
  - `CHECK (expiry_date > collection_date)`

### `MEDICINE_INVENTORY`
- **Primary Key:** `id` (UUIDv4)
- **Foreign Key:** `facility_id` $\to$ `FACILITIES(id)`
- **Integrity Constraints:**
  - `CHECK (units_available >= 0)`
  - `CHECK (units_reserved >= 0)`

### `REQUESTS` & `REQUEST_ITEMS`
- **Primary Key:** `id` (UUIDv4)
- **Foreign Keys:** `requester_id` $\to$ `USERS(id)`, `facility_id` $\to$ `FACILITIES(id)`
- **Normalization (3NF):** Request items are factored into `REQUEST_ITEMS` to support multi-item or batch allocations without repeating groups.

### `AUDIT_LOGS`
- **Primary Key:** `id` (UUIDv4)
- **Purpose:** Immutable log of state transitions (e.g., status changes, stock reservations) for auditability.

---

## 3. Medical Safety & Privacy Principles

1. **No Real Patient PII:** Requisitions store synthetic identifiers and clinical notes without real-world identifying data.
2. **Expired Inventory Masking:** Inventory queries MUST enforce `WHERE expiry_date > CURRENT_DATE AND status = 'AVAILABLE'` to guarantee expired units are never reported as available.
3. **Draft Review Required:** No database tables or Prisma migrations will be generated until this draft model is formally reviewed.
