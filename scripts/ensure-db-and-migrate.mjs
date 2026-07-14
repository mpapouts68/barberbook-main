#!/usr/bin/env node
/**
 * Runtime DB bootstrap for PaaS (Hostman): create SQLite file, apply base schema, run safe migrations.
 * Do NOT run this during Docker build — only at app start when DATABASE_URL is available.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import Database from "better-sqlite3";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveDbPath() {
  const url = process.env.DATABASE_URL || "file:./database.sqlite";
  let filePath = url.replace(/^file:/, "").trim();
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(root, filePath.replace(/^\.\//, ""));
  }
  return filePath;
}

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

const dbFile = resolveDbPath();
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

if (!fs.existsSync(dbFile)) {
  console.log(`[startup] Creating database file: ${dbFile}`);
  new Database(dbFile).close();
}

const db = new Database(dbFile);
const hasCoreSchema = tableExists(db, "users");
db.close();

if (!hasCoreSchema) {
  console.log("[startup] No core tables found — applying base schema (drizzle-kit push)...");
  execSync("npx drizzle-kit push --force", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "file:./database.sqlite",
    },
  });
}

console.log("[startup] Running safe additive migrations...");
const steps = [
  "fix-schema",
  "migrate-reminders",
  "migrate:services-i18n",
  "migrate:shop-photos",
  "migrate:branding",
  "migrate:branding-colors",
  "migrate:branding-i18n",
];

for (const step of steps) {
  try {
    execSync(`npm run ${step}`, { cwd: root, stdio: "inherit", env: process.env });
  } catch (error) {
    console.warn(`[startup] Migration step "${step}" failed (continuing):`, error.message);
  }
}

console.log("[startup] Database ready.");
