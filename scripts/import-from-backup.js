import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Database file paths
const newDbPath = path.join(projectRoot, 'database.sqlite');
const backupDbPath = path.join(projectRoot, 'database.sqlitebackup.sqlite');

// Tables to import (in order of dependencies)
const tables = [
  'users',
  'employees',
  'services',
  'appointments',
  'namedays',
  'push_messages',
  'notifications',
  'fcm_tokens',
  'settings',
  'company_info',
  'shop_config',
  'google_calendar_config',
  'oauth_config'
];

console.log('🔄 Importing Data from Backup');
console.log('==============================\n');

// Check if files exist
if (!fs.existsSync(newDbPath)) {
  console.error(`❌ New database not found: ${newDbPath}`);
  process.exit(1);
}

if (!fs.existsSync(backupDbPath)) {
  console.error(`❌ Backup database not found: ${backupDbPath}`);
  process.exit(1);
}

console.log(`✅ Found new database: ${newDbPath}`);
console.log(`✅ Found backup database: ${backupDbPath}\n`);

const backupDb = new Database(backupDbPath);
const newDb = new Database(newDbPath);

try {
  // Disable foreign key constraints temporarily for import
  newDb.pragma('foreign_keys = OFF');
  
  let totalImported = 0;
  let totalSkipped = 0;

  for (const table of tables) {
    try {
      // Check if table exists in backup
      const backupTableInfo = backupDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?
      `).get(table);

      if (!backupTableInfo) {
        console.log(`⚠️  Table ${table} does not exist in backup, skipping...`);
        continue;
      }

      // Get all rows from backup
      const rows = backupDb.prepare(`SELECT * FROM ${table}`).all();
      
      if (rows.length === 0) {
        console.log(`⚠️  No data in ${table}, skipping...`);
        continue;
      }

      // Get column names from backup table
      const backupColumns = backupDb.prepare(`PRAGMA table_info(${table})`).all();
      const backupColumnNames = backupColumns.map(c => c.name);

      // Get column names from new database table
      const newColumns = newDb.prepare(`PRAGMA table_info(${table})`).all();
      const newColumnNames = newColumns.map(c => c.name);

      // Find columns that exist in both tables
      const commonColumns = backupColumnNames.filter(col => newColumnNames.includes(col));
      
      if (commonColumns.length === 0) {
        console.log(`⚠️  No common columns found for ${table}, skipping...`);
        continue;
      }

      console.log(`📋 Importing ${table}...`);
      console.log(`   Found ${rows.length} rows in backup`);
      console.log(`   Common columns: ${commonColumns.length}/${backupColumnNames.length}`);

      // Clear existing data in new database (optional - comment out if you want to merge)
      const deleteStmt = newDb.prepare(`DELETE FROM ${table}`);
      deleteStmt.run();
      console.log(`   Cleared existing data in ${table}`);

      // Prepare insert statement
      const placeholders = commonColumns.map(() => '?').join(', ');
      const columnNames = commonColumns.join(', ');
      const insertStmt = newDb.prepare(`INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`);

      // Import rows
      const insertMany = newDb.transaction((rows) => {
        let imported = 0;
        let skipped = 0;
        
        for (const row of rows) {
          try {
            // Map values from backup columns to new columns
            const values = commonColumns.map(col => {
              const val = row[col];
              
              // Handle null/undefined
              if (val === null || val === undefined) {
                return null;
              }
              
              // Handle boolean columns (convert 0/1 to proper boolean if needed)
              if (typeof val === 'number' && (val === 0 || val === 1)) {
                // Check if column is boolean type in new schema
                const colInfo = newColumns.find(c => c.name === col);
                if (colInfo && colInfo.type.toUpperCase().includes('INTEGER')) {
                  return val; // Keep as integer for boolean columns
                }
              }
              
              // Handle date/timestamp columns - convert to Unix timestamp if needed
              if (col.includes('_at') || col.includes('_expires')) {
                if (typeof val === 'string') {
                  const date = new Date(val);
                  if (!isNaN(date.getTime())) {
                    return Math.floor(date.getTime() / 1000);
                  }
                }
                // If already a number, assume it's already a timestamp
                if (typeof val === 'number') {
                  return val;
                }
              }
              
              return val;
            });
            
            insertStmt.run(...values);
            imported++;
          } catch (error) {
            skipped++;
            if (skipped <= 5) { // Only show first 5 errors
              console.log(`     ⚠️  Skipped row: ${error.message.substring(0, 60)}`);
            }
          }
        }
        
        return { imported, skipped };
      });

      const result = insertMany(rows);
      totalImported += result.imported;
      totalSkipped += result.skipped;
      
      console.log(`   ✅ Imported ${result.imported} rows`);
      if (result.skipped > 0) {
        console.log(`   ⚠️  Skipped ${result.skipped} rows`);
      }
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error importing ${table}: ${error.message}`);
      console.log('');
    }
  }

  // Re-enable foreign key constraints
  newDb.pragma('foreign_keys = ON');

  console.log('==============================');
  console.log(`✅ Import completed!`);
  console.log(`   Total rows imported: ${totalImported}`);
  if (totalSkipped > 0) {
    console.log(`   Total rows skipped: ${totalSkipped}`);
  }
  console.log(`\n✅ Data has been imported into ${newDbPath}`);

} catch (error) {
  console.error(`\n❌ Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
} finally {
  backupDb.close();
  newDb.close();
}






