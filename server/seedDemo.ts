import "dotenv/config";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { hashPassword } from "./services/auth";
import { seedDatabase } from "./seed";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_LOGO_LANDSCAPE,
  DEMO_LOGO_ROUND,
} from "@shared/demoDefaults";

export async function seedDemo() {
  console.log("[demo] Ensuring demo admin and branding...");

  const passwordHash = await hashPassword(DEMO_ADMIN_PASSWORD);
  const existing = await storage.getUserByEmail(DEMO_ADMIN_EMAIL);

  if (existing) {
    await storage.updateUser(existing.id, {
      firstName: "Admin",
      lastName: "Demo",
      role: "admin",
      emailVerified: true,
      password: passwordHash,
      isActive: true,
    });
    console.log(`[demo] Updated demo admin: ${DEMO_ADMIN_EMAIL}`);
  } else {
    await storage.createUser({
      email: DEMO_ADMIN_EMAIL,
      password: passwordHash,
      firstName: "Admin",
      lastName: "Demo",
      role: "admin",
      emailVerified: true,
    });
    console.log(`[demo] Created demo admin: ${DEMO_ADMIN_EMAIL}`);
  }

  await storage.updateShopBranding({
    businessName: "BarberBook",
    businessNameEn: "BarberBook",
    tagline: "Κλείσε το κούρεμά σου",
    taglineEn: "Book Your Cut",
    logoUrl: DEMO_LOGO_ROUND,
    logoLandscapeUrl: DEMO_LOGO_LANDSCAPE,
  });

  await seedDatabase();
  console.log("[demo] Demo data ready.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[demo] Seed failed:", error);
      process.exit(1);
    });
}
