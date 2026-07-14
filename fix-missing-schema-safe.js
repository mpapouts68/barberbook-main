#!/usr/bin/env node
/**
 * Safe migration script to add missing notifications table and is_recurring columns
 * This script checks if columns/tables exist before adding them
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from environment or use default
const dbPath = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(__dirname, 'database.sqlite');

console.log('🔧 Fixing missing database schema...');
console.log(`📁 Database: ${dbPath}\n`);

if (!fs.existsSync(dbPath)) {
  console.log(`📁 Database not found — creating: ${dbPath}`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  new Database(dbPath).close();
}

const db = new Database(dbPath);

try {
  // Helper function to check if a column exists in a table
  function columnExists(tableName, columnName) {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return tableInfo.some(col => col.name === columnName);
  }

  // Helper function to check if a table exists
  function tableExists(tableName) {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);
    return !!result;
  }

  console.log('📋 Step 1: Checking notifications table...');
  
  // Step 1: Create notifications table if it doesn't exist
  if (!tableExists('notifications')) {
    console.log('  ➕ Creating notifications table...');
    db.exec(`
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('  ✅ Created notifications table');
  } else {
    console.log('  ✓ Notifications table already exists');
  }

  console.log('\n📋 Step 2: Checking appointments table columns...');

  // Step 2: Add missing recurring columns to appointments table
  const recurringColumns = [
    { name: 'is_recurring', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'recurring_pattern', type: 'TEXT' },
    { name: 'recurring_interval', type: 'INTEGER DEFAULT 1' },
    { name: 'recurring_end_date', type: 'TEXT' },
    { name: 'parent_appointment_id', type: 'TEXT' },
    { name: 'next_appointment_id', type: 'TEXT' }
  ];

  for (const col of recurringColumns) {
    if (!columnExists('appointments', col.name)) {
      console.log(`  ➕ Adding column: ${col.name}...`);
      db.exec(`ALTER TABLE appointments ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  ✅ Added column: ${col.name}`);
    } else {
      console.log(`  ✓ Column already exists: ${col.name}`);
    }
  }

  console.log('\n📋 Step 3: Creating indexes...');

  // Step 3: Create indexes
  const indexes = [
    { name: 'idx_notifications_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)' },
    { name: 'idx_notifications_read', sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)' },
    { name: 'idx_notifications_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)' },
    { name: 'idx_appointments_is_recurring', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_is_recurring ON appointments(is_recurring)' },
    { name: 'idx_appointments_parent_appointment_id', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_parent_appointment_id ON appointments(parent_appointment_id)' }
  ];

  for (const idx of indexes) {
    try {
      db.exec(idx.sql);
      console.log(`  ✅ Created index: ${idx.name}`);
    } catch (error) {
      console.log(`  ⚠️  Index ${idx.name} may already exist: ${error.message}`);
    }
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Notifications table: ✓');
  console.log('  - Recurring appointment columns: ✓');
  console.log('  - Indexes: ✓');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}




