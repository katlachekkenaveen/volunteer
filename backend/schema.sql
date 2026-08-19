-- Volunteer Management and Scheduling System
-- MySQL Schema & Seed Data DDL Script

CREATE DATABASE IF NOT EXISTS volunteer_db;
USE volunteer_db;

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS event_assignments;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'volunteer') DEFAULT 'volunteer',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    skills TEXT NULL,
    availability VARCHAR(100) NULL,
    bio TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Events Table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    location VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_volunteers INT DEFAULT 10,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Event Assignments Table
CREATE TABLE event_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    volunteer_id INT NOT NULL,
    status ENUM('assigned', 'confirmed', 'declined', 'completed') DEFAULT 'assigned',
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_volunteer (event_id, volunteer_id)
);

-- 4. Attendance Table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    volunteer_id INT NOT NULL,
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME NULL,
    hours_worked FLOAT DEFAULT 0.0,
    status ENUM('checked_in', 'completed') DEFAULT 'checked_in',
    notes TEXT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for optimized querying
CREATE INDEX idx_user_status ON users(status);
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_event_date ON events(event_date);
CREATE INDEX idx_attendance_volunteer ON attendance(volunteer_id);

-- Sample Data Injections
-- Admin Account (password: admin123)
INSERT INTO users (name, email, phone, password_hash, role, status, skills, availability, bio) VALUES
('System Administrator', 'admin@volunteermsg.org', '+1 555-0100', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'admin', 'approved', 'Management, Event Coordination, Logistics', 'Full-time', 'Lead administrator for the Volunteer Management System.'),
('Sarah Jenkins', 'sarah.j@example.com', '+1 555-0101', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'volunteer', 'approved', 'First Aid, Teaching, Event Support', 'Weekends', 'Passionate community organizer and certified first responder.'),
('Michael Chen', 'm.chen@example.com', '+1 555-0102', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'volunteer', 'approved', 'Food Preparation, Logistics, Driving', 'Evenings & Weekends', 'Dedicated volunteer focused on food security and logistics support.'),
('Emily Davis', 'emily.davis@example.com', '+1 555-0103', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'volunteer', 'pending', 'Social Media, Photography, Graphic Design', 'Flexible', 'Eager to help with public relations and digital media for upcoming charity events.');

-- Sample Events
INSERT INTO events (name, description, location, event_date, start_time, end_time, max_volunteers, status, created_by) VALUES
('City Park Spring Clean-up', 'Join us in cleaning up Central Park, planting native flowers, and restoring community garden beds.', 'Central Park Pavilion, 45th Street', '2026-09-05', '09:00:00', '13:00:00', 15, 'upcoming', 1),
('Community Food Pantry Drive', 'Sorting food donations, packing care bundles, and assisting families at the community food bank.', 'St. Mary Community Center, Hall B', '2026-09-12', '10:00:00', '14:00:00', 10, 'upcoming', 1),
('Youth Coding & Literacy Workshop', 'Mentoring middle school students in basic computer skills and reading comprehension.', 'Downtown Public Library, Room 302', '2026-08-25', '14:00:00', '17:00:00', 6, 'upcoming', 1);

-- Sample Event Assignments
INSERT INTO event_assignments (event_id, volunteer_id, status) VALUES
(1, 2, 'confirmed'),
(1, 3, 'confirmed'),
(2, 2, 'assigned');

-- Sample Completed Attendance Logs
INSERT INTO attendance (event_id, volunteer_id, check_in_time, check_out_time, hours_worked, status, notes) VALUES
(1, 2, '2026-08-10 09:00:00', '2026-08-10 13:00:00', 4.0, 'completed', 'Worked on garden bed restoration.'),
(1, 3, '2026-08-10 09:15:00', '2026-08-10 13:15:00', 4.0, 'completed', 'Handled recycling sorting and transport.');
