-- LifeLink Relational Database DDL Schema (3NF)
-- Developer B — LifeLink Community Blood & Medicine Network
-- Target Database: PostgreSQL 14+

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('USER', 'FACILITY_STAFF', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE facility_type AS ENUM ('HOSPITAL', 'BLOOD_BANK', 'PHARMACY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE inventory_status AS ENUM ('AVAILABLE', 'RESERVED', 'EXPIRED', 'QUARANTINED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE dosage_form AS ENUM ('TABLET', 'CAPSULE', 'INJECTION', 'SYRUP', 'VIAL', 'IV_INFUSION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE request_type AS ENUM ('BLOOD', 'MEDICINE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('PENDING', 'RESERVED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLES

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    facility_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FACILITIES TABLE
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    facility_type facility_type NOT NULL,
    address VARCHAR(300) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude NUMERIC(10, 7) CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(10, 7) CHECK (longitude BETWEEN -180 AND 180),
    contact_phone VARCHAR(30) NOT NULL,
    contact_email VARCHAR(255),
    operating_hours JSONB,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key from users.facility_id to facilities(id)
ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS fk_users_facility;
ALTER TABLE users 
    ADD CONSTRAINT fk_users_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL;

-- BLOOD COMPONENTS CATALOG (Master Catalog)
CREATE TABLE IF NOT EXISTS blood_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    default_shelf_life_days INT NOT NULL CHECK (default_shelf_life_days > 0),
    storage_temp_celsius VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- BLOOD INVENTORY (Batches)
CREATE TABLE IF NOT EXISTS blood_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES blood_components(id) ON DELETE RESTRICT,
    blood_group blood_group NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    total_units INT NOT NULL DEFAULT 0 CHECK (total_units >= 0),
    reserved_units INT NOT NULL DEFAULT 0 CHECK (reserved_units >= 0 AND reserved_units <= total_units),
    collection_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    storage_location VARCHAR(100),
    status inventory_status NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_blood_expiry CHECK (expiry_date > collection_date),
    CONSTRAINT uq_facility_blood_batch UNIQUE (facility_id, batch_number)
);

-- MEDICINES CATALOG (Master Catalog - 3NF)
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200) NOT NULL,
    dosage_form dosage_form NOT NULL,
    strength VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(200),
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- MEDICINE INVENTORY (Batches)
CREATE TABLE IF NOT EXISTS medicine_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    total_units INT NOT NULL DEFAULT 0 CHECK (total_units >= 0),
    reserved_units INT NOT NULL DEFAULT 0 CHECK (reserved_units >= 0 AND reserved_units <= total_units),
    expiry_date DATE NOT NULL,
    storage_location VARCHAR(100),
    status inventory_status NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_facility_med_batch UNIQUE (facility_id, medicine_id, batch_number)
);

-- REQUESTS
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
    request_type request_type NOT NULL,
    urgency urgency_level NOT NULL DEFAULT 'NORMAL',
    status request_status NOT NULL DEFAULT 'PENDING',
    clinical_notes TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- REQUEST ITEMS
CREATE TABLE IF NOT EXISTS request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    blood_component_id UUID REFERENCES blood_components(id) ON DELETE RESTRICT,
    blood_group blood_group,
    medicine_id UUID REFERENCES medicines(id) ON DELETE RESTRICT,
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_fulfilled INT NOT NULL DEFAULT 0 CHECK (quantity_fulfilled >= 0),
    CONSTRAINT chk_item_target CHECK (
        (blood_component_id IS NOT NULL AND medicine_id IS NULL) OR
        (blood_component_id IS NULL AND medicine_id IS NOT NULL)
    )
);

-- INVENTORY RESERVATIONS (Ledger of active & historical holds)
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_item_id UUID NOT NULL REFERENCES request_items(id) ON DELETE CASCADE,
    blood_inventory_id UUID REFERENCES blood_inventory(id) ON DELETE SET NULL,
    medicine_inventory_id UUID REFERENCES medicine_inventory(id) ON DELETE SET NULL,
    reserved_quantity INT NOT NULL CHECK (reserved_quantity > 0),
    status reservation_status NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMPTZ,
    CONSTRAINT chk_res_target CHECK (
        (blood_inventory_id IS NOT NULL AND medicine_inventory_id IS NULL) OR
        (blood_inventory_id IS NULL AND medicine_inventory_id IS NOT NULL)
    )
);

-- REQUEST STATUS HISTORY
CREATE TABLE IF NOT EXISTS request_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS (Polymorphic)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_facilities_city_type ON facilities (city, facility_type, is_verified);
CREATE INDEX IF NOT EXISTS idx_facilities_verified ON facilities (is_verified);
CREATE INDEX IF NOT EXISTS idx_blood_inventory_fac_status ON blood_inventory (facility_id, status);
CREATE INDEX IF NOT EXISTS idx_blood_inventory_lookup ON blood_inventory (blood_group, status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_blood_inventory_expiry ON blood_inventory (expiry_date);
CREATE INDEX IF NOT EXISTS idx_med_inventory_fac_status ON medicine_inventory (facility_id, status);
CREATE INDEX IF NOT EXISTS idx_med_inventory_lookup ON medicine_inventory (medicine_id, status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_med_inventory_expiry ON medicine_inventory (expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicines_search ON medicines (name, generic_name);
CREATE INDEX IF NOT EXISTS idx_requests_facility_status ON requests (facility_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_item_status ON inventory_reservations (request_item_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry ON inventory_reservations (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
