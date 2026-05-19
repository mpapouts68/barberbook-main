-- Migration script to recreate PostgreSQL schema in SQLite
-- This script adds missing tables and updates existing ones to match the schema

-- First, let's add missing columns to existing tables

-- Update users table to match schema
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';

-- Update appointments table to match schema
ALTER TABLE appointments ADD COLUMN employee_id TEXT;
ALTER TABLE appointments ADD COLUMN duration INTEGER DEFAULT 30;
ALTER TABLE appointments ADD COLUMN google_event_id TEXT;

-- Update employees table to match schema
ALTER TABLE employees ADD COLUMN specialties TEXT DEFAULT '[]';
ALTER TABLE employees ADD COLUMN google_calendar_enabled INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN google_calendar_sync_token TEXT;
ALTER TABLE employees ADD COLUMN last_sync_at DATETIME;
ALTER TABLE employees ADD COLUMN auto_sync_enabled INTEGER DEFAULT 0;

-- Update oauth_config table to match schema
ALTER TABLE oauth_config ADD COLUMN google_scopes TEXT DEFAULT '["profile", "email"]';
ALTER TABLE oauth_config ADD COLUMN facebook_scopes TEXT DEFAULT '["email"]';
ALTER TABLE oauth_config ADD COLUMN base_url TEXT DEFAULT 'http://localhost:5000';

-- Update google_calendar_config table to match schema
ALTER TABLE google_calendar_config ADD COLUMN service_account_email TEXT;
ALTER TABLE google_calendar_config ADD COLUMN service_account_key TEXT;
ALTER TABLE google_calendar_config ADD COLUMN project_id TEXT;
ALTER TABLE google_calendar_config ADD COLUMN is_enabled INTEGER DEFAULT 0;
ALTER TABLE google_calendar_config ADD COLUMN time_zone TEXT DEFAULT 'Europe/Athens';
ALTER TABLE google_calendar_config ADD COLUMN default_event_duration INTEGER DEFAULT 30;
ALTER TABLE google_calendar_config ADD COLUMN appointment_prefix TEXT DEFAULT 'Ραντεβού κουρείου';

-- Create missing tables

-- Company info table
CREATE TABLE IF NOT EXISTS company_info (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL DEFAULT 'Barbershop Premium',
    logo_url TEXT,
    description TEXT DEFAULT 'Το καλύτερο κουρείο στην πόλη',
    phone TEXT,
    email TEXT,
    address TEXT,
    working_hours TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"10:00","end":"16:00"}}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shop config table
CREATE TABLE IF NOT EXISTS shop_config (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    working_hours TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"10:00","end":"16:00"}}',
    appointment_duration INTEGER NOT NULL DEFAULT 30,
    buffer_time INTEGER NOT NULL DEFAULT 5,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data

-- Insert default company info
INSERT OR IGNORE INTO company_info (id, name, description) 
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Barbershop Premium', 'Το καλύτερο κουρείο στην πόλη');

-- Insert default shop config
INSERT OR IGNORE INTO shop_config (id, working_hours, appointment_duration, buffer_time)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 
        '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"10:00","end":"16:00"}}',
        30, 5);

-- Insert default settings if they don't exist
INSERT OR IGNORE INTO settings (key, value) VALUES 
('nameday_message', 'Χρόνια Πολλά {name}! Enjoy a 20% discount today at Iron & Steel Barbershop!'),
('nameday_discount', '20');

-- Insert sample employees if none exist
INSERT OR IGNORE INTO employees (id, name, specialties, working_hours, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 'John Barber', '["Haircut", "Beard Trim", "Styling"]', 
 '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"closed","end":"closed"}}', 1),
('550e8400-e29b-41d4-a716-446655440004', 'Mike Stylist', '["Haircut", "Coloring", "Perm"]', 
 '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"closed","end":"closed"}}', 1);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_namedays_date ON namedays(date);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
