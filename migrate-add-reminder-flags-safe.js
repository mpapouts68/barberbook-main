#!/usr/bin/env node
/**
 * Safe migration script to add reminder flags to appointments table
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(__dirname, '..', 'database.sqlite');

console.log('🔧 Adding reminder flags to appointments table...');
console.log(`📁 Database: ${dbPath}\n`);

if (!fs.existsSync(dbPath)) {
  console.log(`📁 Database not found — creating: ${dbPath}`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  new Database(dbPath).close();
}

const db = new Database(dbPath);

try {
  // Helper function to check if a column exists
  function columnExists(tableName, columnName) {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return tableInfo.some(col => col.name === columnName);
  }

  console.log('📋 Checking appointments table columns...');

  // Add reminder_sent_24h column
  if (!columnExists('appointments', 'reminder_sent_24h')) {
    console.log('  ➕ Adding column: reminder_sent_24h...');
    db.exec('ALTER TABLE appointments ADD COLUMN reminder_sent_24h INTEGER DEFAULT 0');
    console.log('  ✅ Added column: reminder_sent_24h');
  } else {
    console.log('  ✓ Column already exists: reminder_sent_24h');
  }

  // Add reminder_sent_2h column
  if (!columnExists('appointments', 'reminder_sent_2h')) {
    console.log('  ➕ Adding column: reminder_sent_2h...');
    db.exec('ALTER TABLE appointments ADD COLUMN reminder_sent_2h INTEGER DEFAULT 0');
    console.log('  ✅ Added column: reminder_sent_2h');
  } else {
    console.log('  ✓ Column already exists: reminder_sent_2h');
  }

  console.log('\n📋 Creating indexes...');

  // Create indexes for better query performance
  const indexes = [
    { name: 'idx_appointments_date_time', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time)' },
    { name: 'idx_appointments_status_date', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date)' }
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
  console.log('  - reminder_sent_24h column: ✓');
  console.log('  - reminder_sent_2h column: ✓');
  console.log('  - Indexes: ✓');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}




