import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const oldDbPath = path.join(projectRoot, 'barbershop.db');

console.log('🔍 Checking old database (barbershop.db)...\n');

if (!fs.existsSync(oldDbPath)) {
  console.log('❌ barbershop.db not found');
  process.exit(0);
}

const db = new Database(oldDbPath);

try {
  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`Found ${tables.length} tables:\n`);

  for (const table of tables) {
    const tableName = table.name;
    const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    console.log(`📋 Table: ${tableName}`);
    console.log(`   Rows: ${rowCount.count}`);
    console.log(`   Columns: ${columns.map(c => c.name).join(', ')}`);
    
    // Show sample data if exists
    if (rowCount.count > 0) {
      const sample = db.prepare(`SELECT * FROM ${tableName} LIMIT 1`).get();
      console.log(`   Sample: ${JSON.stringify(sample).substring(0, 100)}...`);
    }
    console.log('');
  }
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
} finally {
  db.close();
}






