import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// Get database path from environment or use default
let dbPath = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace('file:', '')
  : null;

// Try common database file names if not set
if (!dbPath || !fs.existsSync(dbPath)) {
  const possiblePaths = [
    path.join(__dirname, 'database.sqlite'),
    path.join(__dirname, 'barbershop.db'),
    path.join(__dirname, 'server', 'barbershop.db'),
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).size > 0) {
      dbPath = possiblePath;
      break;
    }
  }
}

if (!dbPath || !fs.existsSync(dbPath)) {
  console.error('❌ Error: Database file not found');
  console.log('Please set DATABASE_URL environment variable or ensure database.sqlite exists');
  process.exit(1);
}

console.log(`📦 Fixing database: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Check if column exists
  const tableInfo = db.prepare("PRAGMA table_info(appointments)").all();
  const hasColumn = tableInfo.some(col => col.name === 'reminder_sent_same_day');
  
  if (hasColumn) {
    console.log('✅ Column reminder_sent_same_day already exists');
  } else {
    console.log('➕ Adding missing column reminder_sent_same_day...');
    db.exec(`
      ALTER TABLE appointments 
      ADD COLUMN reminder_sent_same_day INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✅ Column reminder_sent_same_day added successfully');
  }
  
  // Verify
  const updatedTableInfo = db.prepare("PRAGMA table_info(appointments)").all();
  const reminderColumns = updatedTableInfo.filter(col => col.name.startsWith('reminder_'));
  console.log('\n📋 Reminder columns in appointments table:');
  reminderColumns.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });
  
  db.close();
  console.log('\n✅ Database fix completed successfully!');
} catch (error) {
  console.error('❌ Error fixing database:', error.message);
  process.exit(1);
}
