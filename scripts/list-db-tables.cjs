const Database = require("better-sqlite3");
const files = process.argv.slice(2).length ? process.argv.slice(2) : ["database.sqlite", "barbershop.db"];
for (const f of files) {
  try {
    const db = new Database(f, { readonly: true });
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    console.log(f + ":", rows.map((r) => r.name).join(", ") || "(no tables)");
    db.close();
  } catch (e) {
    console.log(f + ": " + e.message);
  }
}
