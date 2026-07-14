#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";

function toFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    return `file:${normalized}`;
  }
  return `file:./${normalized}`;
}

function isDirWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a SQLite path that is writable in the current environment.
 * PaaS containers (e.g. Hostman) often mount /app as read-only.
 */
export function resolveDatabaseConfig(root = process.cwd()) {
  const configured = process.env.DATABASE_URL || "file:./database.sqlite";
  let filePath = configured.replace(/^file:/, "").trim();
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(root, filePath.replace(/^\.\//, ""));
  }

  const configuredDir = path.dirname(filePath);
  if (isDirWritable(configuredDir)) {
    return { filePath, databaseUrl: toFileUrl(filePath) };
  }

  const fallbacks = [
    process.env.DATA_DIR ? path.join(process.env.DATA_DIR, "database.sqlite") : null,
    path.join(root, "data", "database.sqlite"),
    path.join("/tmp", "barberbook", "database.sqlite"),
    path.join(os.tmpdir(), "barberbook", "database.sqlite"),
  ].filter(Boolean);

  for (const candidate of fallbacks) {
    const dir = path.dirname(candidate);
    if (isDirWritable(dir)) {
      console.warn(
        `[startup] Configured database directory is not writable (${configuredDir}). Using ${candidate}`,
      );
      return { filePath: candidate, databaseUrl: toFileUrl(candidate) };
    }
  }

  throw new Error(
    `No writable directory for SQLite database. Configured: ${configuredDir}. Tried: ${fallbacks.join(", ")}`,
  );
}
