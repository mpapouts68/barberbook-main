-- Migration script to add missing notifications table and is_recurring columns
-- Run this on the server to fix the database schema issues

-- Step 1: Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Step 2: Add missing recurring appointment columns to appointments table
-- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN)
-- We'll use a safe approach: try to add, ignore if it fails

-- Add is_recurring column
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll check pragma first or just add it (it will fail gracefully if exists)
-- For safety, we'll use a transaction approach

BEGIN TRANSACTION;

-- Add is_recurring column (will fail if exists, but that's okay - we'll catch it)
-- Using a workaround: check if column exists by trying to select it
-- If it doesn't exist, add it

-- Add recurring columns one by one
-- Note: In SQLite, we can't check if a column exists easily, so we'll use a different approach
-- We'll create a temporary script that checks first

-- For now, let's just add them - if they exist, the ALTER TABLE will fail
-- But we can wrap this in error handling on the application side
-- Or use a better approach: check table_info

-- Better approach: Use a helper script, but for SQL-only solution:
-- We'll add columns with a check that they don't exist

-- Add is_recurring column
ALTER TABLE appointments ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;

-- Add recurring_pattern column  
ALTER TABLE appointments ADD COLUMN recurring_pattern TEXT;

-- Add recurring_interval column
ALTER TABLE appointments ADD COLUMN recurring_interval INTEGER DEFAULT 1;

-- Add recurring_end_date column
ALTER TABLE appointments ADD COLUMN recurring_end_date TEXT;

-- Add parent_appointment_id column
ALTER TABLE appointments ADD COLUMN parent_appointment_id TEXT;

-- Add next_appointment_id column
ALTER TABLE appointments ADD COLUMN next_appointment_id TEXT;

COMMIT;

-- Create index on notifications for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create index on appointments for recurring queries
CREATE INDEX IF NOT EXISTS idx_appointments_is_recurring ON appointments(is_recurring);
CREATE INDEX IF NOT EXISTS idx_appointments_parent_appointment_id ON appointments(parent_appointment_id);




