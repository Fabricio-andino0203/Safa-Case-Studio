const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
if (!fs.existsSync(mountPath)) fs.mkdirSync(mountPath, { recursive: true });
const dbPath = path.join(mountPath, 'safa.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Migrations for existing databases
const migrations = [
  "ALTER TABLE modelos ADD COLUMN marca TEXT DEFAULT ''",
  "ALTER TABLE modelos ADD COLUMN molde_mask_url TEXT DEFAULT ''",
  "ALTER TABLE modelos ADD COLUMN molde_preview_url TEXT DEFAULT ''",
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

// Seed tiendas if empty
const count = db.prepare('SELECT COUNT(*) as c FROM tiendas').get();
if (count.c === 0) {
  const insert = db.prepare('INSERT INTO tiendas (nombre, direccion) VALUES (?, ?)');
  const seedTiendas = db.transaction(() => {
    for (let i = 1; i <= 7; i++) {
      insert.run(`Tienda ${i}`, `Dirección Tienda ${i}`);
    }
  });
  seedTiendas();
  console.log('✅ 7 tiendas seeded');
}

module.exports = db;
