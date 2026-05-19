-- Add all missing columns to users table
-- Upload this file and run: sqlite3 database.sqlite < fix-db.sql

ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;
ALTER TABLE users ADD COLUMN oauth_provider TEXT;
ALTER TABLE users ADD COLUMN oauth_id TEXT;
ALTER TABLE users ADD COLUMN birthday TEXT;
ALTER TABLE users ADD COLUMN favorite_barbers TEXT NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN notification_preferences TEXT NOT NULL DEFAULT '{"email":true,"push":true,"sms":false,"reminder24h":true,"reminder2h":true}';
ALTER TABLE users ADD COLUMN last_login_at INTEGER;

