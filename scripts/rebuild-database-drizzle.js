import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Database file paths
const dbPath = path.join(projectRoot, 'database.sqlite');
const backupDbPath = path.join(projectRoot, 'database.sqlite.backup');
const exportDataPath = path.join(projectRoot, 'database-export.json');

// Tables to export/import (in order of dependencies)
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

console.log('🔄 Database Rebuild Script (Using Drizzle)');
console.log('==========================================\n');

// Step 1: Export all data
function exportData() {
  console.log('📤 Step 1: Exporting data from existing database...');
  
  if (!fs.existsSync(dbPath)) {
    console.log(`⚠️  Database file not found at ${dbPath}`);
    console.log('   Creating empty export file...');
    fs.writeFileSync(exportDataPath, JSON.stringify({}, null, 2));
    return;
  }

  const db = new Database(dbPath);
  const exportedData = {};

  try {
    for (const table of tables) {
      try {
        // Check if table exists
        const tableInfo = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        
        if (tableInfo) {
          const rows = db.prepare(`SELECT * FROM ${table}`).all();
          exportedData[table] = rows;
          console.log(`  ✅ Exported ${rows.length} rows from ${table}`);
        } else {
          console.log(`  ⚠️  Table ${table} does not exist, skipping...`);
          exportedData[table] = [];
        }
      } catch (error) {
        console.log(`  ❌ Error exporting ${table}: ${error.message}`);
        exportedData[table] = [];
      }
    }

    // Save exported data to JSON file
    fs.writeFileSync(exportDataPath, JSON.stringify(exportedData, null, 2));
    console.log(`\n✅ Data exported to ${exportDataPath}`);
    
    // Create backup of old database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupDbPath);
      console.log(`✅ Backup created: ${backupDbPath}`);
    }
  } catch (error) {
    console.error(`❌ Error during export: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

// Step 2: Recreate database using drizzle-kit push
function recreateDatabase() {
  console.log('\n🔨 Step 2: Recreating database schema using drizzle-kit push...');
  
  // Close any existing database connections
  try {
    if (fs.existsSync(dbPath)) {
      const tempDb = new Database(dbPath);
      tempDb.close();
    }
  } catch (error) {
    console.log(`  ⚠️  Could not close existing database: ${error.message}`);
  }

  // Use drizzle-kit push to sync schema
  try {
    console.log('  📋 Running drizzle-kit push to create/update schema...');
    execSync('npm run db:push', { 
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
    });
    console.log('  ✅ Schema created/updated successfully');
  } catch (error) {
    console.error(`  ❌ Error running drizzle-kit push: ${error.message}`);
    throw error;
  }
}

// Step 3: Import data back
function importData() {
  console.log('\n📥 Step 3: Importing data back...');
  
  if (!fs.existsSync(exportDataPath)) {
    console.log(`⚠️  Export file not found at ${exportDataPath}`);
    console.log('   Skipping import - database will be empty');
    return;
  }

  const exportedData = JSON.parse(fs.readFileSync(exportDataPath, 'utf8'));
  const db = new Database(dbPath);

  try {
    // Disable foreign key constraints temporarily for import
    db.pragma('foreign_keys = OFF');
    
    for (const table of tables) {
      const rows = exportedData[table] || [];
      
      if (rows.length === 0) {
        console.log(`  ⚠️  No data to import for ${table}`);
        continue;
      }

      // Get column names from first row
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnNames = columns.join(', ');
      
      const insertStmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${columnNames}) VALUES (${placeholders})`);
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            // Handle null/undefined
            if (val === null || val === undefined) return null;
            // Handle dates - convert to timestamp if needed
            if (col.includes('_at') && typeof val === 'string') {
              return Math.floor(new Date(val).getTime() / 1000);
            }
            return val;
          });
          try {
            insertStmt.run(...values);
          } catch (error) {
            console.log(`    ⚠️  Skipped row in ${table} due to error: ${error.message}`);
          }
        }
      });

      insertMany(rows);
      console.log(`  ✅ Imported ${rows.length} rows into ${table}`);
    }

    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');
    
    console.log('\n✅ Data imported successfully');
  } catch (error) {
    console.error(`❌ Error importing data: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

// Main execution
async function main() {
  try {
    exportData();
    recreateDatabase();
    importData();
    
    console.log('\n🎉 Database rebuild completed successfully!');
    console.log(`\n📁 Files:`);
    console.log(`   - Database: ${dbPath}`);
    console.log(`   - Backup: ${backupDbPath}`);
    console.log(`   - Export: ${exportDataPath}`);
    console.log('\n✅ You can now use the rebuilt database');
  } catch (error) {
    console.error('\n❌ Database rebuild failed:', error.message);
    console.log('\n💡 If something went wrong, you can restore from backup:');
    console.log(`   Copy ${backupDbPath} to ${dbPath}`);
    process.exit(1);
  }
}

main();






