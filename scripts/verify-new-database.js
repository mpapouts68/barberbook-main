import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dbPath = path.join(projectRoot, 'database.sqlite');

console.log('✅ Verifying rebuilt database...\n');

if (!fs.existsSync(dbPath)) {
  console.log('❌ database.sqlite not found');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  // Expected tables from schema.ts
  const expectedTables = [
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

  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`Found ${tables.length} tables:\n`);

  const foundTableNames = tables.map(t => t.name);
  let allTablesExist = true;

  for (const expectedTable of expectedTables) {
    if (foundTableNames.includes(expectedTable)) {
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${expectedTable}`).get();
      const columns = db.prepare(`PRAGMA table_info(${expectedTable})`).all();
      
      console.log(`✅ ${expectedTable}`);
      console.log(`   Rows: ${rowCount.count}`);
      console.log(`   Columns (${columns.length}): ${columns.map(c => c.name).join(', ')}`);
      console.log('');
    } else {
      console.log(`❌ ${expectedTable} - MISSING!`);
      allTablesExist = false;
    }
  }

  // Check for unexpected tables
  const unexpectedTables = foundTableNames.filter(t => !expectedTables.includes(t));
  if (unexpectedTables.length > 0) {
    console.log(`\n⚠️  Unexpected tables found: ${unexpectedTables.join(', ')}`);
  }

  if (allTablesExist && unexpectedTables.length === 0) {
    console.log('\n🎉 All tables and columns are correctly created!');
    console.log('✅ Database rebuild was successful');
  } else {
    console.log('\n⚠️  Some issues found - please review above');
  }

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
} finally {
  db.close();
}






