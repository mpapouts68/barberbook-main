import 'dotenv/config';
import { storage } from "./storage";
import { initializeDatabase } from "./database";

const sampleServices = [
  {
    name: "Κούρεμα",
    description: "Κλασικό κούρεμα με μηχανή και ψαλίδι",
    price: 15,
    duration: 30,
    isActive: true,
  },
  {
    name: "Κούρεμα + Πώληση",
    description: "Κούρεμα με πώληση και styling",
    price: 25,
    duration: 45,
    isActive: true,
  },
  {
    name: "Πώληση",
    description: "Πώληση γενειάδας με hot towel",
    price: 12,
    duration: 20,
    isActive: true,
  },
  {
    name: "Κούρεμα + Πώληση + Μπανάκι",
    description: "Πλήρης περιποίηση με μπανάκι και styling",
    price: 35,
    duration: 60,
    isActive: true,
  },
  {
    name: "Fade Cut",
    description: "Σύγχρονο fade κούρεμα με gradient",
    price: 20,
    duration: 40,
    isActive: true,
  },
  {
    name: "Beard Trim",
    description: "Στολίδι γενειάδας με styling",
    price: 10,
    duration: 15,
    isActive: true,
  },
  {
    name: "Hair Wash",
    description: "Πλύσιμο μαλλιών με premium products",
    price: 8,
    duration: 15,
    isActive: true,
  },
  {
    name: "Hair Styling",
    description: "Styling μαλλιών με styling products",
    price: 12,
    duration: 20,
    isActive: true,
  },
];

const sampleEmployees = [
  {
    name: "Γιάννης Παπαδόπουλος",
    specialties: JSON.stringify(["Κούρεμα", "Fade Cut", "Styling"]),
    workingHours: JSON.stringify({
      monday: { start: "09:00", end: "18:00" },
      tuesday: { start: "09:00", end: "18:00" },
      wednesday: { start: "09:00", end: "18:00" },
      thursday: { start: "09:00", end: "18:00" },
      friday: { start: "09:00", end: "18:00" },
      saturday: { start: "09:00", end: "15:00" },
      sunday: { start: "closed", end: "closed" },
    }),
    description: "Έμπειρος κομμωτής με 10+ χρόνια εμπειρία. Ειδικεύεται σε σύγχρονα κουρέματα και styling.",
    googleCalendarId: null,
    googleCalendarEnabled: false,
    autoSyncEnabled: false,
  },
  {
    name: "Μάριος Κωνσταντίνου",
    specialties: JSON.stringify(["Πώληση", "Beard Trim", "Hot Towel"]),
    workingHours: JSON.stringify({
      monday: { start: "10:00", end: "19:00" },
      tuesday: { start: "10:00", end: "19:00" },
      wednesday: { start: "10:00", end: "19:00" },
      thursday: { start: "10:00", end: "19:00" },
      friday: { start: "10:00", end: "19:00" },
      saturday: { start: "09:00", end: "16:00" },
      sunday: { start: "closed", end: "closed" },
    }),
    description: "Ειδικός στην περιποίηση γενειάδας και κλασικά κουρέματα. Προσωπική προσέγγιση σε κάθε πελάτη.",
    googleCalendarId: null,
    googleCalendarEnabled: false,
    autoSyncEnabled: false,
  },
  {
    name: "Νίκος Αντωνίου",
    specialties: JSON.stringify(["Fade Cut", "Κούρεμα", "Hair Styling"]),
    workingHours: JSON.stringify({
      monday: { start: "08:00", end: "17:00" },
      tuesday: { start: "08:00", end: "17:00" },
      wednesday: { start: "08:00", end: "17:00" },
      thursday: { start: "08:00", end: "17:00" },
      friday: { start: "08:00", end: "17:00" },
      saturday: { start: "08:00", end: "14:00" },
      sunday: { start: "closed", end: "closed" },
    }),
    description: "Νεαρός κομμωτής με σύγχρονη τεχνική. Ειδικεύεται σε fade cuts και modern styling.",
    googleCalendarId: null,
    googleCalendarEnabled: false,
    autoSyncEnabled: false,
  },
  {
    name: "Δημήτρης Γεωργίου",
    specialties: JSON.stringify(["Κούρεμα + Πώληση", "Μπανάκι", "Premium Services"]),
    workingHours: JSON.stringify({
      monday: { start: "09:00", end: "18:00" },
      tuesday: { start: "09:00", end: "18:00" },
      wednesday: { start: "09:00", end: "18:00" },
      thursday: { start: "09:00", end: "18:00" },
      friday: { start: "09:00", end: "18:00" },
      saturday: { start: "09:00", end: "15:00" },
      sunday: { start: "closed", end: "closed" },
    }),
    description: "Master barber με πλήρη γκάμα premium services. Ιδανικός για πλήρη περιποίηση.",
    googleCalendarId: null,
    googleCalendarEnabled: false,
    autoSyncEnabled: false,
  },
];

async function seed() {
  try {
    console.log("🌱 Starting database seed...");
    
    // Initialize database
    await initializeDatabase();
    
    // Seed services
    console.log("📋 Adding sample services...");
    const existingServices = await storage.getAllServices();
    console.log(`  Found ${existingServices.length} existing services`);
    
    for (const service of sampleServices) {
      try {
        // Check if service with same name already exists
        const existing = existingServices.find(s => s.name === service.name);
        if (existing) {
          // Update existing service to ensure it's active
          await storage.updateService(existing.id, { 
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            isActive: true 
          });
          console.log(`  ✓ Updated service: ${service.name}`);
          continue;
        }
        const created = await storage.createService(service);
        console.log(`  ✓ Added service: ${service.name} (ID: ${created.id})`);
      } catch (error: any) {
        console.error(`  ✗ Error adding service ${service.name}:`, error.message);
        console.error(`  Full error:`, error);
      }
    }
    
    // Verify services were added
    const finalServices = await storage.getAllServices();
    console.log(`  📊 Total services in database: ${finalServices.length}`);
    
    // Seed employees
    console.log("👥 Adding sample employees...");
    const existingEmployees = await storage.getAllEmployees();
    console.log(`  Found ${existingEmployees.length} existing employees`);
    
    for (const employee of sampleEmployees) {
      try {
        // Check if employee with same name already exists
        const existing = existingEmployees.find(e => e.name === employee.name);
        if (existing) {
          // Update existing employee to ensure it's active
          await storage.updateEmployee(existing.id, { 
            name: employee.name,
            specialties: employee.specialties,
            workingHours: employee.workingHours,
            description: employee.description,
            googleCalendarId: employee.googleCalendarId,
            googleCalendarEnabled: employee.googleCalendarEnabled,
            autoSyncEnabled: employee.autoSyncEnabled,
            isActive: true 
          });
          console.log(`  ✓ Updated employee: ${employee.name}`);
          continue;
        }
        const created = await storage.createEmployee(employee);
        console.log(`  ✓ Added employee: ${employee.name} (ID: ${created.id})`);
      } catch (error: any) {
        console.error(`  ✗ Error adding employee ${employee.name}:`, error.message);
        console.error(`  Full error:`, error);
      }
    }
    
    // Verify employees were added
    const finalEmployees = await storage.getAllEmployees();
    console.log(`  📊 Total employees in database: ${finalEmployees.length}`);
    
    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run seed if executed directly
seed().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { seed };

