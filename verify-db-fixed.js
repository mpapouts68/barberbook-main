import Database from 'better-sqlite3';
const db = new Database('./database.sqlite');

// Check notifications table
const notificationsExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='notifications'
`).get();

// Check is_recurring column
const tableInfo = db.prepare('PRAGMA table_info(appointments)').all();
const hasIsRecurring = tableInfo.some(col => col.name === 'is_recurring');

db.close();

if (notificationsExists && hasIsRecurring) {
    console.log('✅ Database schema is correct');
    console.log('  - notifications table: ✓');
    console.log('  - is_recurring column: ✓');
    process.exit(0);
} else {
    console.log('❌ Database schema is incomplete');
    if (!notificationsExists) console.log('  - Missing: notifications table');
    if (!hasIsRecurring) console.log('  - Missing: is_recurring column');
    process.exit(1);
}




