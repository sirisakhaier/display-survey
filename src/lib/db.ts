import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'display_survey.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      STORE_ID TEXT PRIMARY KEY,
      Customer TEXT NOT NULL,
      Store_ID_Customer TEXT,
      STORE_NAME TEXT,
      Store_Name_TH TEXT NOT NULL,
      Province_TH TEXT NOT NULL,
      Region_TH TEXT NOT NULL,
      Active_Inactive TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE INDEX IF NOT EXISTS idx_stores_customer ON stores(Customer);
    CREATE INDEX IF NOT EXISTS idx_stores_region ON stores(Region_TH);
    CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(Active_Inactive);

    CREATE TABLE IF NOT EXISTS models (
      Model TEXT PRIMARY KEY,
      Brand TEXT NOT NULL,
      Category TEXT NOT NULL,
      SubCategory TEXT,
      Active_Inactive TEXT NOT NULL DEFAULT 'Active',
      Remark TEXT,
      Update_by TEXT,
      Update_date TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_models_brand ON models(Brand);
    CREATE INDEX IF NOT EXISTS idx_models_category ON models(Category);
    CREATE INDEX IF NOT EXISTS idx_models_active ON models(Active_Inactive);

    CREATE TABLE IF NOT EXISTS display_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_phone TEXT NOT NULL,
      submitted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(STORE_ID) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entries_store ON display_entries(store_id);
    CREATE INDEX IF NOT EXISTS idx_entries_submitted ON display_entries(submitted_at);

    CREATE TABLE IF NOT EXISTS display_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entry_id) REFERENCES display_entries(id) ON DELETE CASCADE,
      UNIQUE(entry_id, model)
    );

    CREATE INDEX IF NOT EXISTS idx_items_entry ON display_entry_items(entry_id);
    CREATE INDEX IF NOT EXISTS idx_items_model ON display_entry_items(model);

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dimension_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      dimension_type TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export default getDb;
