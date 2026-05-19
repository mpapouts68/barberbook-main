import { readFileSync, existsSync } from "fs";
import path from "path";
import { db } from "../db";
import { namedays } from "@shared/schema";

export interface NamedayEntry {
  date: string; // MM-DD
  name: string;
}

const DEFAULT_EORTOLOGIO_FILE = "eortologio_namedays.csv";
const LEGACY_FILE = "namedays_greek.csv";

/** Parse eortologio_namedays.csv lines: DD/MM,NAME */
export function parseEortologioCsv(content: string): NamedayEntry[] {
  const entries: NamedayEntry[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^\uFEFF/, "");
    if (!line) continue;

    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) continue;

    const dateStr = line.slice(0, commaIndex).trim();
    const name = line.slice(commaIndex + 1).trim();
    if (!dateStr || !name) continue;

    const parts = dateStr.split("/");
    if (parts.length !== 2) continue;

    const [day, month] = parts;
    if (!day || !month || Number.isNaN(Number(day)) || Number.isNaN(Number(month))) {
      continue;
    }

    entries.push({
      date: `${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      name,
    });
  }

  return entries;
}

/** Parse legacy namedays_greek.csv: M/D/YYYY ..., "NAME" */
export function parseLegacyNamedaysCsv(content: string): NamedayEntry[] {
  const entries: NamedayEntry[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const [dateStr, nameStr] = line.split(",");
    if (!dateStr || !nameStr) continue;

    const datePart = dateStr.split(" ")[0];
    const [month, day] = datePart.split("/");
    const name = nameStr.replace(/"/g, "").trim();

    if (name && month && day) {
      entries.push({
        date: `${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        name,
      });
    }
  }

  return entries;
}

export function resolveNamedaysCsvPath(customPath?: string): string {
  if (customPath) {
    return path.isAbsolute(customPath)
      ? customPath
      : path.join(process.cwd(), customPath);
  }

  const eortologio = path.join(process.cwd(), DEFAULT_EORTOLOGIO_FILE);
  if (existsSync(eortologio)) {
    return eortologio;
  }

  return path.join(process.cwd(), LEGACY_FILE);
}

/**
 * Load full eortologio into namedays table (replaces all rows).
 */
export async function loadEortologioNamedays(options?: {
  filePath?: string;
  force?: boolean;
}): Promise<number> {
  const csvPath = resolveNamedaysCsvPath(options?.filePath);
  if (!existsSync(csvPath)) {
    throw new Error(`Namedays CSV not found: ${csvPath}`);
  }

  console.log(`Loading namedays from ${csvPath}...`);
  const csvContent = readFileSync(csvPath, "utf-8");

  const namedayEntries =
    csvPath.includes("eortologio") || csvPath.endsWith(DEFAULT_EORTOLOGIO_FILE)
      ? parseEortologioCsv(csvContent)
      : parseLegacyNamedaysCsv(csvContent);

  if (namedayEntries.length === 0) {
    throw new Error("No nameday entries parsed from CSV");
  }

  console.log(`Parsed ${namedayEntries.length} nameday entries`);

  if (!options?.force) {
    const existing = await db.select().from(namedays);
    if (existing.length > 0) {
      console.log(
        `Database already has ${existing.length} namedays. Use --force to replace.`,
      );
      return existing.length;
    }
  }

  await db.delete(namedays);
  console.log("Cleared existing namedays");

  const batchSize = 200;
  for (let i = 0; i < namedayEntries.length; i += batchSize) {
    const batch = namedayEntries.slice(i, i + batchSize);
    await db.insert(namedays).values(batch);
  }

  const total = await db.select().from(namedays);
  console.log(`Namedays loaded successfully (${total.length} rows in database)`);
  return total.length;
}

/** @deprecated Use loadEortologioNamedays */
export async function loadGreekNamedays() {
  return loadEortologioNamedays({ force: true });
}
