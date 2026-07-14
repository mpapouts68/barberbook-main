#!/usr/bin/env node
/** Add bilingual business name / tagline columns to shop_branding. */
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

const NEW_COLUMNS = [
  ["business_name_en", "TEXT"],
  ["tagline_en", "TEXT"],
];

function tableExists(name) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

try {
  if (!tableExists("shop_branding")) {
    console.log("shop_branding missing — run migrate:branding first");
    process.exit(0);
  }

  for (const [name, ddl] of NEW_COLUMNS) {
    if (!columnExists("shop_branding", name)) {
      db.exec(`ALTER TABLE shop_branding ADD COLUMN ${name} ${ddl}`);
      console.log(`Added column shop_branding.${name}`);
    } else {
      console.log(`Column shop_branding.${name} already exists`);
    }
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  db.close();
}
