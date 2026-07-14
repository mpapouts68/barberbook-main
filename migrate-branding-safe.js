#!/usr/bin/env node
/** Create shop_branding table for white-label theming. */
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
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

function tableExists(name) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

try {
  if (!tableExists("shop_branding")) {
    db.exec(`
      CREATE TABLE shop_branding (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL DEFAULT 'BarberBook',
        tagline TEXT NOT NULL DEFAULT 'Book Your Cut',
        logo_url TEXT,
        logo_landscape_url TEXT,
        primary_color TEXT NOT NULL DEFAULT '#C62828',
        secondary_color TEXT NOT NULL DEFAULT '#1A237E',
        accent_color TEXT NOT NULL DEFAULT '#1565C0',
        background_color TEXT NOT NULL DEFAULT '#0a0a0a',
        text_highlight_color TEXT NOT NULL DEFAULT '#FFFFFF',
        landing_images TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log("Created table shop_branding");
  } else {
    console.log("Table shop_branding already exists");
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  db.close();
}
