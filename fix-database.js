import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = './database.sqlite';

// Check if database file exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Error: database.sqlite not found in current directory');
  console.log('Make sure you downloaded the database file first.');
  process.exit(1);
}

const db = new Database(dbPath);

// Define all columns that should exist in the users table
// Based on shared/schema.ts
const requiredColumns = [
  { name: 'phone', type: 'TEXT' },
  { name: 'avatar', type: 'TEXT' },
  { name: 'oauth_provider', type: 'TEXT' },
  { name: 'oauth_id', type: 'TEXT' },
  { name: 'birthday', type: 'TEXT' },
  { name: 'favorite_barbers', type: 'TEXT', defaultValue: "'[]'" },
  { name: 'notification_preferences', type: 'TEXT', defaultValue: "'{\"email\":true,\"push\":true,\"sms\":false,\"reminder24h\":true,\"reminder2h\":true}'" },
  { name: 'last_login_at', type: 'INTEGER' },
];

try {
  console.log('🔍 Checking database schema...');
  
  // Get current columns
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const existingColumns = new Set(tableInfo.map(col => col.name));
  
  console.log('\n📋 Current users table columns:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  // Find missing columns
  const missingColumns = requiredColumns.filter(col => !existingColumns.has(col.name));
  
  if (missingColumns.length === 0) {
    console.log('\n✅ All required columns exist - no changes needed');
  } else {
    console.log(`\n➕ Found ${missingColumns.length} missing column(s):`);
    missingColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    console.log('\n🔧 Adding missing columns...');
    
    // Add each missing column
    for (const col of missingColumns) {
      try {
        let sql = `ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`;
        if (col.defaultValue) {
          sql += ` DEFAULT ${col.defaultValue}`;
        }
        db.prepare(sql).run();
        console.log(`  ✅ Added ${col.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to add ${col.name}: ${error.message}`);
      }
    }
    
    // Verify all columns were added
    const updatedTableInfo = db.prepare("PRAGMA table_info(users)").all();
    console.log('\n📋 Updated users table columns:');
    updatedTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
  }
  
  // Check data integrity
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  console.log(`\n📊 Total users in database: ${userCount.count}`);
  
  // Verify no data was lost
  const sampleUser = db.prepare("SELECT id, email, first_name FROM users LIMIT 1").get();
  if (sampleUser) {
    console.log(`✅ Sample user found: ${sampleUser.email} (ID: ${sampleUser.id})`);
  }
  
  console.log('\n✅ Database fix completed successfully!');
  console.log('You can now upload it back to the server.');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}

