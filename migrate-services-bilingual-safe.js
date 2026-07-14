#!/usr/bin/env node
/**
 * Add name_en / description_en to services and backfill basic translations.
 * Run: node migrate-services-bilingual-safe.js
 */
import "dotenv/config";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, "").trim()
  : path.join(__dirname, "database.sqlite");

if (!fs.existsSync(dbPath)) {
  console.log(`Database not found — creating: ${dbPath}`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  new Database(dbPath).close();
}

const db = new Database(dbPath);

function columnExists(table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

/** Greek → English labels for default demo services (always applied on migrate run) */
const backfill = [
  { name: "Κούρεμα", nameEn: "Haircut", descriptionEn: "Classic haircut" },
  { name: "Πλαινό", nameEn: "Side trim", descriptionEn: "Sides and sideburns trim" },
  { name: "Χτένισμα", nameEn: "Blow dry", descriptionEn: "Hair styling and blow dry" },
  { name: "Λούσιμο", nameEn: "Hair wash", descriptionEn: "Shampoo and rinse" },
  {
    name: "Ξύρισμα ( με φαλτσέτα - παραδοσιακό )",
    nameEn: "Traditional straight razor shave",
    descriptionEn: "Hot towel straight razor shave",
  },
  { name: "Μούσια", nameEn: "Beard trim", descriptionEn: "Beard and moustache shaping" },
  {
    name: "Κούρεμα - Μούσια",
    nameEn: "Haircut + beard",
    descriptionEn: "Includes hair wash and blow dry",
  },
  {
    name: "Περιποίηση προσώπου",
    nameEn: "Facial treatment",
    descriptionEn: "Face care and grooming",
  },
  // Seed / demo catalog (if present)
  {
    name: "Κούρεμα + Πώληση",
    nameEn: "Haircut + beard",
    descriptionEn: "Haircut with beard trim and styling",
  },
  { name: "Πώληση", nameEn: "Beard trim", descriptionEn: "Beard trim with hot towel" },
  {
    name: "Κούρεμα + Πώληση + Μπανάκι",
    nameEn: "Haircut + beard + shampoo",
    descriptionEn: "Full grooming with shampoo and styling",
  },
  { name: "Fade Cut", nameEn: "Fade cut", descriptionEn: "Modern fade with gradient" },
  { name: "Beard Trim", nameEn: "Beard trim", descriptionEn: "Beard shaping and styling" },
  { name: "Hair Wash", nameEn: "Hair wash", descriptionEn: "Hair wash with premium products" },
  { name: "Hair Styling", nameEn: "Hair styling", descriptionEn: "Hair styling with premium products" },
];

try {
  if (!columnExists("services", "name_en")) {
    db.exec("ALTER TABLE services ADD COLUMN name_en TEXT");
    console.log("Added column name_en");
  }
  if (!columnExists("services", "description_en")) {
    db.exec("ALTER TABLE services ADD COLUMN description_en TEXT");
    console.log("Added column description_en");
  }

  const update = db.prepare(`
    UPDATE services
    SET name_en = ?, description_en = COALESCE(?, description_en)
    WHERE name = ?
  `);

  for (const row of backfill) {
    update.run(row.nameEn, row.descriptionEn, row.name);
  }

  db.exec(`
    UPDATE services SET name_en = name WHERE name_en IS NULL OR name_en = '';
    UPDATE services SET description_en = description
    WHERE description IS NOT NULL AND (description_en IS NULL OR description_en = '');
  `);

  const count = db.prepare("SELECT COUNT(*) as n FROM services").get();
  console.log(`Done. ${count.n} services in database.`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  db.close();
}
