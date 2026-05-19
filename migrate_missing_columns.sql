-- Add only the missing columns that don't exist yet

-- Add missing columns to users table (if role doesn't exist)
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';

-- Add missing columns to appointments table
ALTER TABLE appointments ADD COLUMN google_event_id TEXT;

-- Add missing columns to employees table
ALTER TABLE employees ADD COLUMN auto_sync_enabled INTEGER DEFAULT 0;

-- Add missing columns to oauth_config table
ALTER TABLE oauth_config ADD COLUMN facebook_scopes TEXT DEFAULT '["email"]';

-- Add missing columns to google_calendar_config table
ALTER TABLE google_calendar_config ADD COLUMN service_account_email TEXT;
ALTER TABLE google_calendar_config ADD COLUMN project_id TEXT;
ALTER TABLE google_calendar_config ADD COLUMN is_enabled INTEGER DEFAULT 0;
ALTER TABLE google_calendar_config ADD COLUMN time_zone TEXT DEFAULT 'Europe/Athens';
ALTER TABLE google_calendar_config ADD COLUMN default_event_duration INTEGER DEFAULT 30;
ALTER TABLE google_calendar_config ADD COLUMN appointment_prefix TEXT DEFAULT 'Ραντεβού κουρείου';

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
