-- Migration Script: Convert to New Authentication System
-- This script safely migrates existing users to the new authentication schema

-- Step 1: Backup existing users (optional, for safety)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- Step 2: Delete the demo user if it exists
DELETE FROM users WHERE email = 'john.doe@demo.com' OR oauth_provider = 'demo';

-- Step 3: Add new columns with proper defaults
-- Note: SQLite doesn't support adding NOT NULL columns directly, so we do it in steps

-- Add nullable columns first
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN password TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN verification_token TEXT;
ALTER TABLE users ADD COLUMN reset_password_token TEXT;
ALTER TABLE users ADD COLUMN reset_password_expires INTEGER;
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN last_login_at INTEGER;

-- Step 4: Update existing OAuth users to have verified email
UPDATE users SET email_verified = 1 WHERE oauth_provider IS NOT NULL;

-- Step 5: Make sure all users are active
UPDATE users SET is_active = 1 WHERE is_active IS NULL;

-- Step 6: Show remaining users
SELECT id, first_name, email, oauth_provider, email_verified, is_active FROM users;


