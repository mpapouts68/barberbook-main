import 'dotenv/config';
import { db } from "./db";
import { sql } from "drizzle-orm";

// Set default DATABASE_URL before any imports
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./database.sqlite';
}

async function verifyDatabaseSchema() {
  try {
    console.log("🔍 Verifying database schema...");
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL}\n`);
    
    // Check if tables exist
    const tables = await db.all(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log("📊 Tables found:");
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.name}`);
    });
    
    // Check users table structure
    console.log("\n👤 Users table structure:");
    try {
      const userColumns = await db.all(sql`
        PRAGMA table_info(users)
      `);
      userColumns.forEach((col: any) => {
        console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
    } catch (error) {
      console.error("  ✗ Error checking users table:", error);
    }
    
    // Check if users table has data
    console.log("\n👥 Users in database:");
    try {
      const users = await db.all(sql`SELECT id, email, first_name, role, email_verified, is_active FROM users LIMIT 10`);
      if (users.length === 0) {
        console.log("  ⚠️  No users found in database");
        console.log("  💡 You need to register a user first");
      } else {
        users.forEach((user: any) => {
          console.log(`  - ${user.email} (${user.first_name}) - Role: ${user.role}, Verified: ${user.email_verified}, Active: ${user.is_active}`);
        });
      }
    } catch (error) {
      console.error("  ✗ Error querying users:", error);
    }
    
    // Check for missing columns
    console.log("\n🔧 Checking for missing columns...");
    const requiredColumns = ['id', 'first_name', 'email', 'password', 'role', 'email_verified', 'is_active', 'birthday'];
    try {
      const userColumns = await db.all(sql`PRAGMA table_info(users)`);
      const columnNames = userColumns.map((col: any) => col.name);
      
      const missing = requiredColumns.filter(col => !columnNames.includes(col));
      if (missing.length > 0) {
        console.log(`  ⚠️  Missing columns: ${missing.join(', ')}`);
        console.log("  💡 Run: npm run db:push");
      } else {
        console.log("  ✓ All required columns present");
      }
    } catch (error) {
      console.error("  ✗ Error checking columns:", error);
    }
    
  } catch (error) {
    console.error("❌ Error verifying database:", error);
  }
}

verifyDatabaseSchema();












