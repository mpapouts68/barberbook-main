import { db } from "./db";
import { users, appointments, namedays, settings } from "@shared/schema";
import { eq } from "drizzle-orm";

// loadGreekNamedays is optional - script may not exist in production builds
// We'll try to import it dynamically at runtime
async function tryLoadGreekNamedays(): Promise<boolean> {
  try {
    const loadNamedaysModule = await import("./scripts/load-namedays");
    await loadNamedaysModule.loadGreekNamedays();
    return true;
  } catch (error) {
    // Script not found or failed - will use fallback sample data
    return false;
  }
}

// Initialize database and seed data
export async function initializeDatabase() {
  // Database tables are already created by drizzle:push
  // We just need to seed the initial data

  // Insert sample namedays data
  const sampleNamedays = [
    { date: "01-01", name: "Βασίλης" },
    { date: "01-01", name: "Βασιλική" },
    { date: "01-06", name: "Θεοφάνης" },
    { date: "01-06", name: "Θεοφανία" },
    { date: "01-07", name: "Ιωάννης" },
    { date: "01-17", name: "Αντώνιος" },
    { date: "01-25", name: "Γρηγόριος" },
    { date: "02-02", name: "Καίσας" },
    { date: "02-10", name: "Χαράλαμπος" },
    { date: "03-25", name: "Ευαγγελία" },
    { date: "04-23", name: "Γεώργιος" },
    { date: "05-21", name: "Κωνσταντίνος" },
    { date: "05-21", name: "Ελένη" },
    { date: "06-24", name: "Ιωάννης" },
    { date: "06-29", name: "Πέτρος" },
    { date: "06-29", name: "Παύλος" },
    { date: "07-17", name: "Μαρίνα" },
    { date: "07-20", name: "Ηλίας" },
    { date: "07-26", name: "Παρασκευή" },
    { date: "07-27", name: "Παντελεήμων" },
    { date: "08-15", name: "Μαρία" },
    { date: "08-15", name: "Παναγιώτα" },
    { date: "09-14", name: "Σταυρός" },
    { date: "10-26", name: "Δημήτριος" },
    { date: "11-08", name: "Μιχαήλ" },
    { date: "11-08", name: "Γαβριήλ" },
    { date: "11-30", name: "Ανδρέας" },
    { date: "12-04", name: "Βαρβάρα" },
    { date: "12-06", name: "Νικόλαος" },
    { date: "12-09", name: "Άννα" },
    { date: "12-25", name: "Χριστός" }
  ];

  // Check if namedays already exist - if not, load Greek namedays
  const existingNamedays = await db.select().from(namedays);
  if (existingNamedays.length === 0) {
    const loaded = await tryLoadGreekNamedays();
    if (!loaded) {
      // Script not available or failed, use sample data
      console.log("Using sample namedays data");
      for (const nameday of sampleNamedays) {
        await db.insert(namedays).values(nameday);
      }
    } else {
      console.log("Greek namedays loaded successfully");
    }
  }

  // Insert default settings
  const defaultSettings = [
    { key: "nameday_message", value: "Χρόνια Πολλά {name}! Enjoy a 20% discount today at Iron & Steel Barbershop!" },
    { key: "nameday_discount", value: "20" }
  ];

  for (const setting of defaultSettings) {
    const [existing] = await db.select().from(settings).where(eq(settings.key, setting.key));
    if (!existing) {
      await db.insert(settings).values(setting);
    }
  }

  console.log("Database initialized successfully");
}
