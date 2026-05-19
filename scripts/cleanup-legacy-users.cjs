/**
 * Remove legacy barbershop users (e.g. Fade Factory) and their related data.
 *
 * Usage:
 *   node scripts/cleanup-legacy-users.cjs --dry-run
 *   node scripts/cleanup-legacy-users.cjs --execute
 *   node scripts/cleanup-legacy-users.cjs --execute --pattern fadefactory
 *
 * Default: matches email containing fadefactory / fade-factory / fadefactory.cloud
 *   --walk-ins-only   only @no-email.local walk-in accounts
 *   --all-customers   every user with role=customer (dangerous — dry-run first!)
 * Never deletes role=admin unless --include-admins
 */
const Database = require("better-sqlite3");
const path = require("path");

const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");
const includeAdmins = args.includes("--include-admins");
const walkInsOnly = args.includes("--walk-ins-only");
const allCustomers = args.includes("--all-customers");
const patternIdx = args.indexOf("--pattern");
const pattern =
  patternIdx >= 0 && args[patternIdx + 1]
    ? args[patternIdx + 1]
    : "fadefactory|fade-factory|fade\\.factory|fadefactoryapp";

const dbPath =
  process.env.DATABASE_URL?.replace(/^file:/, "") ||
  path.join(__dirname, "..", "database.sqlite");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const re = new RegExp(pattern, "i");

const allUsers = db.prepare("SELECT id, email, first_name, role, created_at FROM users").all();
const targets = allUsers.filter((u) => {
  if (!includeAdmins && u.role === "admin") return false;
  if (allCustomers) return u.role === "customer";
  if (walkInsOnly) return (u.email || "").endsWith("@no-email.local");
  return re.test(u.email || "");
});

console.log(`Database: ${dbPath}`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
console.log(`Pattern: ${pattern}`);
console.log(`Users to remove: ${targets.length}\n`);

if (targets.length === 0) {
  console.log("No matching users.");
  process.exit(0);
}

for (const u of targets) {
  const apptCount = db
    .prepare("SELECT COUNT(*) AS c FROM appointments WHERE user_id = ?")
    .get(u.id).c;
  console.log(`- ${u.email} (${u.first_name}) role=${u.role} appointments=${apptCount}`);
}

if (dryRun) {
  console.log("\nRun with --execute to delete.");
  process.exit(0);
}

const deleteUserTx = db.transaction((userId) => {
  db.prepare("DELETE FROM fcm_tokens WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM appointments WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
});

let deleted = 0;
for (const u of targets) {
  try {
    deleteUserTx(u.id);
    deleted++;
  } catch (e) {
    console.error(`Failed ${u.email}:`, e.message);
  }
}

console.log(`\nDeleted ${deleted} user(s).`);
