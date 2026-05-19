import 'dotenv/config';
import { storage } from "./storage";

// Set default DATABASE_URL before any imports
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./database.sqlite';
}

async function checkDatabase() {
  try {
    console.log("🔍 Checking database...");
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
    
    const services = await storage.getAllServices();
    const employees = await storage.getAllEmployees();
    
    console.log(`\n📊 Database Status:`);
    console.log(`  Services: ${services.length}`);
    console.log(`  Employees: ${employees.length}`);
    
    if (services.length > 0) {
      console.log(`\n📋 Services:`);
      services.slice(0, 5).forEach(s => {
        console.log(`  - ${s.name} (Active: ${s.isActive})`);
      });
    }
    
    if (employees.length > 0) {
      console.log(`\n👥 Employees:`);
      employees.slice(0, 5).forEach(e => {
        console.log(`  - ${e.name} (Active: ${e.isActive})`);
      });
    }
    
    if (services.length === 0 && employees.length === 0) {
      console.log("\n⚠️  Database appears empty!");
      console.log("   Run: npm run seed");
    }
  } catch (error) {
    console.error("❌ Error checking database:", error);
  }
}

checkDatabase();












