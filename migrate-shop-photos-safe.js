#!/usr/bin/env node
/** Create shop_photos table for dashboard gallery. */
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

function tableExists(name) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

try {
  if (!tableExists("shop_photos")) {
    db.exec(`
      CREATE TABLE shop_photos (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        caption TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    console.log("Created table shop_photos");
  } else {
    console.log("Table shop_photos already exists");
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  db.close();
}
