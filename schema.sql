-- ==========================================
-- BITS Campus Resource & Inventory System
-- RDBMS: PostgreSQL
-- Normalization: 3NF
-- ==========================================

-- ------------------------------------------
-- 1. Custom Types (Enums)
-- ------------------------------------------
CREATE TYPE status_enum AS ENUM (
    'available', 'reserved', 'in_use', 'maintenance', 'decommissioned'
);

CREATE TYPE approval_enum AS ENUM (
    'pending', 'approved_by_secretary', 'approved_by_faculty', 'rejected'
);

CREATE TYPE payment_enum AS ENUM (
    'not_applicable', 'pending', 'deducted_from_budget', 'personal_fine_paid'
);

-- ------------------------------------------
-- 2. Independent Tables (Parents)
-- ------------------------------------------
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) UNIQUE NOT NULL,
    office_location VARCHAR(100)
);

CREATE TABLE clubs (
    club_id SERIAL PRIMARY KEY,
    club_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    allocated_budget DECIMAL(15,2) DEFAULT 0.00,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    CHECK (current_balance >= 0) -- Constraint to prevent negative balance
);

CREATE TABLE resource_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    buffer_time_minutes INT DEFAULT 0
);

-- ------------------------------------------
-- 3. Dependent Tables (Children)
-- ------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    bits_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(role_id) ON DELETE RESTRICT,
    club_id INT REFERENCES clubs(club_id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(dept_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    category_id INT REFERENCES resource_categories(category_id) ON DELETE RESTRICT,
    status status_enum DEFAULT 'available',
    is_fixed_asset BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    fine_per_hour DECIMAL(10,2) DEFAULT 0.00
);

-- ------------------------------------------
-- 4. Core Transactional Table (Junction)
-- ------------------------------------------
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    resource_id INT REFERENCES resources(resource_id) ON DELETE RESTRICT,
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    actual_return_time TIMESTAMP NULL,
    purpose TEXT,
    approval_status approval_enum DEFAULT 'pending',
    payment_status payment_enum DEFAULT 'not_applicable',
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    CHECK (end_time > start_time) -- Constraint to ensure valid time slots
);

-- ------------------------------------------
-- 5. Audit & Communication Tables
-- ------------------------------------------
CREATE TABLE maintenance_logs (
    log_id SERIAL PRIMARY KEY,
    resource_id INT REFERENCES resources(resource_id) ON DELETE CASCADE,
    technician_name VARCHAR(100),
    issue_description TEXT NOT NULL,
    repair_cost DECIMAL(10,2) DEFAULT 0.00,
    completion_date TIMESTAMP NULL
);

CREATE TABLE notifications (
    notif_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- TASK 1: CONCURRENCY CONTROL (PREVENT DOUBLE BOOKINGS)
-- =========================================================================

-- Step A: Create the logic function that checks for overlapping time slots
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM bookings
        WHERE resource_id = NEW.resource_id
        AND approval_status IN ('approved_by_secretary', 'approved_by_faculty')
        AND (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
    ) THEN
        RAISE EXCEPTION 'Resource is already booked for this time slot.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step B: Attach the trigger to run automatically before any insert
CREATE TRIGGER prevent_double_booking
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_booking_overlap();

-- =========================================================================
-- TASK 2: PROJECT EVALUATION REQUIREMENTS (DATABASE ROLES)
-- =========================================================================

-- Step C: Create a DBA role with ALL rights
CREATE ROLE dba_admin WITH LOGIN PASSWORD 'AdminPass123!' SUPERUSER CREATEDB CREATEROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dba_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dba_admin;

-- Step D: Create a View-Only user
CREATE ROLE view_only_user WITH LOGIN PASSWORD 'ViewPass123!';
GRANT CONNECT ON DATABASE irsdb TO view_only_user;
GRANT USAGE ON SCHEMA public TO view_only_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO view_only_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO view_only_user;

-- Step E: Create a View and Update user (No Create User/Table rights)
CREATE ROLE view_update_user WITH LOGIN PASSWORD 'UpdatePass123!' NOSUPERUSER NOCREATEROLE NOCREATEDB;
GRANT CONNECT ON DATABASE irsdb TO view_update_user;
GRANT USAGE ON SCHEMA public TO view_update_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO view_update_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO view_update_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO view_update_user;
