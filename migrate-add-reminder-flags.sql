-- Migration: Add reminder flags to appointments table
-- This allows tracking which reminders have been sent for each appointment

-- Add reminder tracking columns
ALTER TABLE appointments ADD COLUMN reminder_sent_24h INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN reminder_sent_2h INTEGER DEFAULT 0;

-- Create index for faster queries on upcoming appointments
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date);

-- Note: reminder_sent_24h and reminder_sent_2h are INTEGER (0 = not sent, 1 = sent)
-- This allows easy boolean checks in SQL queries




