#!/usr/bin/env node
/**
 * Runtime DB bootstrap for PaaS (Hostman): pick a writable SQLite path, apply schema, run migrations, start server.
 * Do NOT run this during Docker build — only at app start.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";
import Database from "better-sqlite3";
import { resolveDatabaseConfig } from "./resolve-db-path.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

const { filePath: dbFile, databaseUrl } = resolveDatabaseConfig(root);
process.env.DATABASE_URL = databaseUrl;
console.log(`[startup] Using database: ${dbFile}`);

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
    env: { ...process.env, DATABASE_URL: databaseUrl },
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
    execSync(`npm run ${step}`, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  } catch (error) {
    console.warn(`[startup] Migration step "${step}" failed (continuing):`, error.message);
  }
}

console.log("[startup] Seeding demo admin, branding, and sample data...");
try {
  execSync("npm run seed:demo", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
} catch (error) {
  console.warn("[startup] Demo seed failed (continuing):", error.message);
}

console.log("[startup] Database ready. Starting server...");

const server = spawn("node", ["dist/index.js"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
