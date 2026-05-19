-- Migration script to add birthday and FCM tokens support
-- Run this manually if drizzle-kit push doesn't work

-- Add birthday column to users table (if it doesn't exist)
ALTER TABLE users ADD COLUMN birthday TEXT;

-- Create fcm_tokens table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);












