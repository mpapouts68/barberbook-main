import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Database file paths
const oldDbPath = path.join(projectRoot, 'database.sqlite');
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

console.log('🔄 Database Rebuild Script');
console.log('==========================\n');

// Step 1: Export all data
function exportData() {
  console.log('📤 Step 1: Exporting data from existing database...');
  
  if (!fs.existsSync(oldDbPath)) {
    console.log(`⚠️  Database file not found at ${oldDbPath}`);
    console.log('   Creating empty export file...');
    fs.writeFileSync(exportDataPath, JSON.stringify({}, null, 2));
    return;
  }

  const db = new Database(oldDbPath);
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
    if (fs.existsSync(oldDbPath)) {
      fs.copyFileSync(oldDbPath, backupDbPath);
      console.log(`✅ Backup created: ${backupDbPath}`);
    }
  } catch (error) {
    console.error(`❌ Error during export: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

// Step 2: Recreate database with full schema
function recreateDatabase() {
  console.log('\n🔨 Step 2: Recreating database with full schema...');
  
  // Close any existing connections and delete old database
  if (fs.existsSync(oldDbPath)) {
    try {
      // Try to close any open connections by opening and immediately closing
      const tempDb = new Database(oldDbPath);
      tempDb.close();
      
      // Wait a bit for file handles to release
      await wait(100);
      
      // Try to delete
      let attempts = 0;
      while (attempts < 5) {
        try {
          fs.unlinkSync(oldDbPath);
          console.log('  ✅ Deleted old database file');
          break;
        } catch (error) {
          if (error.code === 'EBUSY' && attempts < 4) {
            console.log(`  ⏳ Database file is locked, waiting... (attempt ${attempts + 1}/5)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      if (error.code === 'EBUSY') {
        console.log('  ⚠️  Database file is locked. Please close any applications using it.');
        console.log('  💡 You may need to stop the server or close database tools.');
        throw new Error('Database file is locked. Please close all connections and try again.');
      }
      throw error;
    }
  }

  // Create new empty database
  const db = new Database(oldDbPath);
  
  try {
    // Create all tables based on schema.ts structure
    console.log('  📋 Creating tables...');
    
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        phone TEXT,
        avatar TEXT,
        oauth_provider TEXT,
        oauth_id TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        email_verified INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT,
        reset_password_token TEXT,
        reset_password_expires INTEGER,
        birthday TEXT,
        favorite_barbers TEXT NOT NULL DEFAULT '[]',
        notification_preferences TEXT NOT NULL DEFAULT '{"email":true,"push":true,"sms":false,"reminder24h":true,"reminder2h":true}',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created users table');

    // Employees table
    db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialties TEXT NOT NULL DEFAULT '[]',
        avatar TEXT,
        description TEXT,
        google_calendar_id TEXT,
        google_calendar_enabled INTEGER NOT NULL DEFAULT 0,
        google_calendar_sync_token TEXT,
        last_sync_at INTEGER,
        auto_sync_enabled INTEGER NOT NULL DEFAULT 0,
        working_hours TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"15:00"},"sunday":{"start":"closed","end":"closed"}}',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created employees table');

    // Services table
    db.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        duration INTEGER NOT NULL DEFAULT 30,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created services table');

    // Appointments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        service TEXT NOT NULL,
        barber TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 30,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        google_event_id TEXT,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurring_pattern TEXT,
        recurring_interval INTEGER DEFAULT 1,
        recurring_end_date TEXT,
        parent_appointment_id TEXT,
        next_appointment_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);
    console.log('    ✅ Created appointments table');

    // Namedays table
    db.exec(`
      CREATE TABLE IF NOT EXISTS namedays (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `);
    console.log('    ✅ Created namedays table');

    // Push messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS push_messages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        audience TEXT NOT NULL,
        sent_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created push_messages table');

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
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
    console.log('    ✅ Created notifications table');

    // FCM tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        device_info TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('    ✅ Created fcm_tokens table');

    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      )
    `);
    console.log('    ✅ Created settings table');

    // Company info table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_info (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Barbershop Premium',
        logo_url TEXT,
        description TEXT DEFAULT 'Το καλύτερο κουρείο στην πόλη',
        phone TEXT,
        email TEXT,
        address TEXT,
        working_hours TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"15:00"},"sunday":{"start":"closed","end":"closed"}}',
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created company_info table');

    // Shop config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS shop_config (
        id TEXT PRIMARY KEY,
        working_hours TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"20:00"},"friday":{"start":"09:00","end":"20:00"},"saturday":{"start":"08:00","end":"19:00"},"sunday":{"start":"10:00","end":"16:00"}}',
        appointment_duration INTEGER NOT NULL DEFAULT 30,
        buffer_time INTEGER NOT NULL DEFAULT 5,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created shop_config table');

    // Google Calendar config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS google_calendar_config (
        id TEXT PRIMARY KEY,
        service_account_email TEXT NOT NULL,
        service_account_key TEXT NOT NULL,
        project_id TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 0,
        time_zone TEXT NOT NULL DEFAULT 'Europe/Athens',
        default_event_duration INTEGER NOT NULL DEFAULT 30,
        appointment_prefix TEXT DEFAULT 'Ραντεβού κουρείου',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created google_calendar_config table');

    // OAuth config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_config (
        id TEXT PRIMARY KEY,
        google_client_id TEXT,
        google_client_secret TEXT,
        google_enabled INTEGER NOT NULL DEFAULT 0,
        google_scopes TEXT NOT NULL DEFAULT '["profile", "email"]',
        facebook_app_id TEXT,
        facebook_app_secret TEXT,
        facebook_enabled INTEGER NOT NULL DEFAULT 0,
        facebook_scopes TEXT NOT NULL DEFAULT '["email"]',
        base_url TEXT NOT NULL DEFAULT 'http://localhost:5100',
        session_secret TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log('    ✅ Created oauth_config table');

    // Create indexes for better performance
    console.log('\n  📊 Creating indexes...');
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id)`);
    console.log('    ✅ Created indexes');

    console.log('\n✅ Database recreated with full schema');
  } catch (error) {
    console.error(`❌ Error creating database: ${error.message}`);
    throw error;
  } finally {
    db.close();
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
  const db = new Database(oldDbPath);

  try {
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
      
      const insertStmt = db.prepare(`INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`);
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          const values = columns.map(col => row[col] ?? null);
          insertStmt.run(...values);
        }
      });

      insertMany(rows);
      console.log(`  ✅ Imported ${rows.length} rows into ${table}`);
    }

    console.log('\n✅ Data imported successfully');
  } catch (error) {
    console.error(`❌ Error importing data: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  try {
    exportData();
    await recreateDatabase();
    importData();
    
    console.log('\n🎉 Database rebuild completed successfully!');
    console.log(`\n📁 Files:`);
    console.log(`   - Database: ${oldDbPath}`);
    console.log(`   - Backup: ${backupDbPath}`);
    console.log(`   - Export: ${exportDataPath}`);
    console.log('\n✅ You can now use the rebuilt database');
  } catch (error) {
    console.error('\n❌ Database rebuild failed:', error);
    console.log('\n💡 If something went wrong, you can restore from backup:');
    console.log(`   Copy ${backupDbPath} to ${oldDbPath}`);
    process.exit(1);
  }
}

main();






