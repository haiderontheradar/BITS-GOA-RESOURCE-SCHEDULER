-- ==========================================
-- BITS IRS - MOCK DATA SEEDING (STEP 2)
-- Run this ONLY after schema.sql is executed
-- ==========================================

-- Insert Base Data
INSERT INTO roles (role_name) VALUES ('Admin'), ('Club_Secretary'), ('Faculty_Incharge'), ('Student');
INSERT INTO departments (dept_name, office_location) VALUES ('CSIS', 'A-Wing'), ('EEE', 'C-Wing'), ('Mechanical', 'B-Wing');
INSERT INTO clubs (club_name, category, allocated_budget, current_balance) VALUES ('ASCII', 'Technical', 50000.00, 45000.00), ('Photography Club', 'Cultural', 80000.00, 75000.00);
INSERT INTO resource_categories (category_name, buffer_time_minutes) VALUES ('AV Equipment', 30), ('Lab Space', 60);

-- Insert Dummy Users
INSERT INTO users (bits_id, full_name, email, password_hash, role_id, club_id, department_id) VALUES 
('2024A7PS0001G', 'Test Student', 'f20240001@goa.bits-pilani.ac.in', 'hashed_pw_1', 4, 1, 1),
('2024A7PS0002G', 'Test Secretary', 'f20240002@goa.bits-pilani.ac.in', 'hashed_pw_2', 2, 2, 1);

-- Insert Dummy Resources
INSERT INTO resources (resource_name, category_id, status, is_fixed_asset, hourly_rate, fine_per_hour) VALUES 
('Sony A7III Camera', 1, 'available', FALSE, 500.00, 100.00),
('CSIS AI Lab', 2, 'available', TRUE, 0.00, 0.00);

-- Insert Dummy Booking
INSERT INTO bookings (user_id, resource_id, start_time, end_time, purpose, approval_status) VALUES 
(1, 1, '2026-04-02 14:00:00', '2026-04-02 18:00:00', 'Covering technical fest events', 'approved_by_secretary');
