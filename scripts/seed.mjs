import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'display_survey.db');
const STORE_CSV_PATH = path.join(process.cwd(), 'Dimension Store.csv');
const MODEL_CSV_PATH = path.join(process.cwd(), 'Dimension Model.csv');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🚀 Initializing Display Survey Database...');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  // 1. Create tables
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

  // 2. Normalization map
  const CATEGORY_MAP = {
    'rf': 'Refrigerator',
    'refrigerator': 'Refrigerator',
    'wm': 'Washing machine',
    'washing machine': 'Washing machine',
    'tv': 'Television',
    'television': 'Television',
    'fz': 'Freezer',
    'freezer': 'Freezer',
    'wh': 'Water heater',
    'water heater': 'Water heater',
    'water dispenser': 'Water dispenser',
    'ac': 'Air conditioner',
    'air conditioner': 'Air conditioner',
  };

  function normalizeCategory(raw) {
    if (!raw) return 'Other';
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
    if (lower.startsWith('refrig') || lower === 'rf') return 'Refrigerator';
    if (lower.startsWith('wash') || lower === 'wm') return 'Washing machine';
    if (lower.startsWith('tele') || lower === 'tv') return 'Television';
    if (lower.startsWith('freez') || lower === 'fz') return 'Freezer';
    if (lower.startsWith('water heat') || lower === 'wh') return 'Water heater';
    if (lower.startsWith('water disp')) return 'Water dispenser';
    if (lower === 'ac' || lower.startsWith('air cond')) return 'Air conditioner';
    return trimmed;
  }

  function cleanSubCategory(raw) {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (trimmed === '!n/a' || trimmed === '#N/A' || trimmed === 'N/A' || trimmed === 'n/a' || trimmed === '-') {
      return '';
    }
    return trimmed;
  }

  // 3. Seed Admin & Viewer users
  console.log('👤 Seeding default Admin & Viewer users...');
  const insertUser = db.prepare(`
    INSERT INTO admin_users (username, password_hash, role)
    VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      role = excluded.role
  `);

  const adminHash = bcrypt.hashSync('admin1234', 10);
  const viewerHash = bcrypt.hashSync('viewer1234', 10);

  insertUser.run('admin', adminHash, 'admin');
  insertUser.run('viewer', viewerHash, 'viewer');
  console.log('✅ Admin & Viewer accounts configured.');

  // 4. Seed Stores
  if (fs.existsSync(STORE_CSV_PATH)) {
    console.log('🏪 Ingesting Dimension Store.csv...');
    const storeCsvContent = fs.readFileSync(STORE_CSV_PATH, 'utf8');
    const parsedStores = Papa.parse(storeCsvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const insertStore = db.prepare(`
      INSERT INTO stores (
        STORE_ID, Customer, Store_ID_Customer, STORE_NAME, Store_Name_TH, Province_TH, Region_TH, Active_Inactive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(STORE_ID) DO UPDATE SET
        Customer = excluded.Customer,
        Store_ID_Customer = excluded.Store_ID_Customer,
        STORE_NAME = excluded.STORE_NAME,
        Store_Name_TH = excluded.Store_Name_TH,
        Province_TH = excluded.Province_TH,
        Region_TH = excluded.Region_TH,
        Active_Inactive = excluded.Active_Inactive
    `);

    const insertManyStores = db.transaction((rows) => {
      let count = 0;
      for (const row of rows) {
        const storeId = (row['STORE_ID'] || '').trim();
        const customer = (row['Customer'] || '').trim();
        if (!storeId || !customer) continue;

        const storeIdCustomer = (row['Store ID Customer'] || '').trim();
        const storeName = (row['STORE_NAME'] || '').trim();
        const storeNameTh = (row['Store Name TH'] || storeName || storeId).trim();
        const provinceTh = (row['Province TH'] || '').trim();
        const regionTh = (row['Region TH'] || '').trim();
        const activeInactive = (row['Active-Inactive'] || 'Active').trim() === 'Active' ? 'Active' : 'Not active';

        insertStore.run(
          storeId,
          customer,
          storeIdCustomer,
          storeName,
          storeNameTh,
          provinceTh,
          regionTh,
          activeInactive
        );
        count++;
      }
      return count;
    });

    const storeCount = insertManyStores(parsedStores.data);
    console.log(`✅ Ingested ${storeCount} stores.`);
  } else {
    console.warn(`⚠️ Dimension Store.csv not found at ${STORE_CSV_PATH}`);
  }

  // 5. Seed Models
  if (fs.existsSync(MODEL_CSV_PATH)) {
    console.log('📦 Ingesting Dimension Model.csv...');
    const modelCsvContent = fs.readFileSync(MODEL_CSV_PATH, 'utf8');
    const parsedModels = Papa.parse(modelCsvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const insertModel = db.prepare(`
      INSERT INTO models (
        Model, Brand, Category, SubCategory, Active_Inactive, Remark, Update_by, Update_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(Model) DO UPDATE SET
        Brand = excluded.Brand,
        Category = excluded.Category,
        SubCategory = excluded.SubCategory,
        Active_Inactive = excluded.Active_Inactive,
        Remark = excluded.Remark,
        Update_by = excluded.Update_by,
        Update_date = excluded.Update_date
    `);

    const insertManyModels = db.transaction((rows) => {
      let count = 0;
      for (const row of rows) {
        const model = (row['Model'] || '').trim();
        const brand = (row['Brand'] || '').trim();
        if (!model || !brand) continue;

        const category = normalizeCategory(row['Category']);
        const subCategory = cleanSubCategory(row['SubCategory']);
        const activeInactive = (row['Active-Inactive'] || 'Active').trim() === 'Active' ? 'Active' : 'Not active';
        const remark = (row['Remark'] || '').trim();
        const updateBy = (row['Update by'] || 'system').trim();
        const updateDate = (row['Update date'] || '').trim();

        insertModel.run(
          model,
          brand,
          category,
          subCategory,
          activeInactive,
          remark,
          updateBy,
          updateDate
        );
        count++;
      }
      return count;
    });

    const modelCount = insertManyModels(parsedModels.data);
    console.log(`✅ Ingested ${modelCount} models.`);
  } else {
    console.warn(`⚠️ Dimension Model.csv not found at ${MODEL_CSV_PATH}`);
  }

  console.log('🎉 Database seeding complete!');
} catch (err) {
  console.error('❌ Database seeding failed:', err);
  process.exit(1);
} finally {
  try {
    db.close();
    console.log('🔒 Database connection closed cleanly.');
  } catch (e) {
    // Ignore close errors if already closed
  }
}
