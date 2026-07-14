import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function resolveSqlitePath(databaseUrl: string): string {
  let filePath = databaseUrl.replace(/^file:/, '').trim();
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath.replace(/^\.\//, ''));
  }
  return filePath;
}

const sqlitePath = resolveSqlitePath(process.env.DATABASE_URL);
fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
console.log(`[db] Using SQLite database: ${sqlitePath}`);

const sqlite = new Database(sqlitePath);
export const db = drizzle(sqlite, { schema });