# LifeLink — Entity-Relationship Architecture (3NF Relational Model)

> **Status:** APPROVED & FINALIZED (Conforming to Third Normal Form)  
> **Course Track:** Database Engineering (DE-01 & DE-02)  
> **Target Schema:** PostgreSQL 14+ / Prisma ORM

---

## 1. Entity-Relationship Overview (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ FACILITIES : "manages/staffs"
    USERS ||--o{ REQUESTS : "places"
    USERS ||--o{ REQUEST_STATUS_HISTORY : "triggers"
    USERS ||--o{ AUDIT_LOGS : "acts"

    FACILITIES ||--o{ BLOOD_INVENTORY : "stocks"
    FACILITIES ||--o{ MEDICINE_INVENTORY : "stocks"
    FACILITIES ||--o{ REQUESTS : "fulfills"

    BLOOD_COMPONENTS ||--o{ BLOOD_INVENTORY : "classifies"
    MEDICINES ||--o{ MEDICINE_INVENTORY : "classifies"

    REQUESTS ||--o{ REQUEST_ITEMS : "contains"
    REQUESTS ||--o{ REQUEST_STATUS_HISTORY : "tracks"

    REQUEST_ITEMS ||--o{ INVENTORY_RESERVATIONS : "allocates"
    BLOOD_INVENTORY ||--o{ INVENTORY_RESERVATIONS : "held_by"
    MEDICINE_INVENTORY ||--o{ INVENTORY_RESERVATIONS : "held_by"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        string role "USER | FACILITY_STAFF | ADMIN"
        uuid facility_id FK "nullable"
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
        string postal_code
        decimal latitude "CHECK -90 to 90"
        decimal longitude "CHECK -180 to 180"
        string contact_phone
        string contact_email
        jsonb operating_hours
        boolean is_verified
        uuid manager_user_id FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    BLOOD_COMPONENTS {
        uuid id PK
        string code UK "WHOLE_BLOOD | PRBC | PLATELETS | FFP | CRYOPRECIPITATE"
        string name
        int default_shelf_life_days
        string storage_temp_celsius
        text description
        timestamp created_at
    }

    BLOOD_INVENTORY {
        uuid id PK
        uuid facility_id FK
        uuid component_id FK
        string blood_group "A+ | A- | B+ | B- | AB+ | AB- | O+ | O-"
        string batch_number
        int total_units "CHECK >= 0"
        int reserved_units "CHECK >= 0 AND <= total_units"
        date collection_date
        date expiry_date "CHECK > collection_date"
        string storage_location
        string status "AVAILABLE | RESERVED | EXPIRED | QUARANTINED"
        timestamp created_at
        timestamp updated_at
    }

    MEDICINES {
        uuid id PK
        string name
        string generic_name
        string dosage_form "TABLET | CAPSULE | INJECTION | SYRUP | VIAL | IV_INFUSION"
        string strength
        string manufacturer
        string category
        text description
        timestamp created_at
        timestamp updated_at
    }

    MEDICINE_INVENTORY {
        uuid id PK
        uuid facility_id FK
        uuid medicine_id FK
        string batch_number
        int total_units "CHECK >= 0"
        int reserved_units "CHECK >= 0 AND <= total_units"
        date expiry_date
        string storage_location
        string status "AVAILABLE | RESERVED | EXPIRED | QUARANTINED"
        timestamp created_at
        timestamp updated_at
    }

    REQUESTS {
        uuid id PK
        string request_number UK
        uuid requester_id FK
        uuid facility_id FK
        string request_type "BLOOD | MEDICINE"
        string urgency "NORMAL | URGENT | CRITICAL"
        string status "PENDING | RESERVED | PARTIALLY_FULFILLED | FULFILLED | CANCELLED | EXPIRED"
        text clinical_notes
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    REQUEST_ITEMS {
        uuid id PK
        uuid request_id FK
        uuid blood_component_id FK "nullable"
        string blood_group "nullable"
        uuid medicine_id FK "nullable"
        int quantity_requested "CHECK > 0"
        int quantity_reserved "CHECK >= 0"
        int quantity_fulfilled "CHECK >= 0"
    }

    INVENTORY_RESERVATIONS {
        uuid id PK
        uuid request_item_id FK
        uuid blood_inventory_id FK "nullable"
        uuid medicine_inventory_id FK "nullable"
        int reserved_quantity "CHECK > 0"
        string status "ACTIVE | CONFIRMED | RELEASED | EXPIRED"
        timestamp expires_at
        timestamp created_at
        timestamp released_at
    }

    REQUEST_STATUS_HISTORY {
        uuid id PK
        uuid request_id FK
        string from_status
        string to_status
        uuid changed_by_user_id FK
        text notes
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        string entity_type "REQUEST | INVENTORY | FACILITY | USER"
        uuid entity_id
        uuid actor_id FK "nullable"
        string action
        jsonb details
        timestamp created_at
    }
```

---

## 2. Normalization & Design Justifications (3NF)

1. **Medicines Master Catalog vs. Inventory:**
   - In 1NF/2NF, medicine attributes (name, generic name, dosage form, strength) were repeatedly stored on every batch in `medicine_inventory`.
   - Splitting into `medicines` and `medicine_inventory` eliminates transitive dependencies ($X \to Y \to Z$), achieving 3NF.
2. **Blood Components Catalog:**
   - Defines clinical constants ($shelf\_life$, storage temperature) independently of stock batches.
3. **Explicit Reservation Ledger:**
   - `inventory_reservations` models reservation holds explicitly, preserving ACID guarantees and avoiding ghost allocations.
4. **Scoper Uniqueness:**
   - Composite unique key `(facility_id, batch_number)` reflects real-world clinical supply chains where batch identifiers are assigned regionally.
