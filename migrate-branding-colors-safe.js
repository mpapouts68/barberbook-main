#!/usr/bin/env node
/** Add extended color columns to shop_branding for full white-label palette. */
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

const NEW_COLUMNS = [
  ["primary_foreground_color", "TEXT NOT NULL DEFAULT '#000000'"],
  ["card_color", "TEXT NOT NULL DEFAULT '#121212'"],
  ["surface_color", "TEXT NOT NULL DEFAULT '#1c1c1c'"],
  ["border_color", "TEXT NOT NULL DEFAULT '#333333'"],
  ["input_background_color", "TEXT NOT NULL DEFAULT '#0d0d0d'"],
  ["text_primary_color", "TEXT NOT NULL DEFAULT '#fafafa'"],
  ["text_muted_color", "TEXT NOT NULL DEFAULT '#a3a3a3'"],
  ["text_subtle_color", "TEXT NOT NULL DEFAULT '#737373'"],
  ["destructive_color", "TEXT NOT NULL DEFAULT '#ef4444'"],
  ["success_color", "TEXT NOT NULL DEFAULT '#22c55e'"],
  ["warning_color", "TEXT NOT NULL DEFAULT '#eab308'"],
  ["overlay_color", "TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.82)'"],
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
