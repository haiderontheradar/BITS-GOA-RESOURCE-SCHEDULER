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