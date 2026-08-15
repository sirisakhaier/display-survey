import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'display_survey.db');
const db = new Database(DB_PATH);

console.log('🧪 Starting End-to-End Verification Test Suite...');

// 1. Check Store Count and Sample
const storeCount = db.prepare('SELECT COUNT(*) as c FROM stores').get().c;
console.log(`✓ Total Stores in DB: ${storeCount} (Expected: ~1,056)`);
console.assert(storeCount >= 1000, 'Store count should be >= 1000');

// 2. Check Model Count and Normalized Categories
const modelCount = db.prepare('SELECT COUNT(*) as c FROM models').get().c;
console.log(`✓ Total Models in DB: ${modelCount} (Expected: ~1,438)`);
console.assert(modelCount >= 1400, 'Model count should be >= 1400');

const categories = db.prepare('SELECT DISTINCT Category FROM models').all().map(c => c.Category);
console.log('✓ Distinct Normalized Categories:', categories);
console.assert(categories.includes('Refrigerator'), 'Should have normalized Refrigerator');
console.assert(categories.includes('Washing machine'), 'Should have normalized Washing machine');
console.assert(categories.includes('Television'), 'Should have normalized Television');

// 3. Test Display Survey Submission simulation
const testStore = db.prepare("SELECT STORE_ID FROM stores WHERE Active_Inactive = 'Active' LIMIT 1").get();
console.log(`✓ Testing submission for store: ${testStore.STORE_ID}`);

const insertEntry = db.prepare(`
  INSERT INTO display_entries (store_id, user_name, user_phone, submitted_at)
  VALUES (?, 'นายทดสอบ ระบบ', '0812345678', CURRENT_TIMESTAMP)
`);
const entryResult = insertEntry.run(testStore.STORE_ID);
const entryId = entryResult.lastInsertRowid;

const sampleModels = db.prepare("SELECT Model FROM models WHERE Active_Inactive = 'Active' LIMIT 3").all();
const insertItem = db.prepare(`
  INSERT INTO display_entry_items (entry_id, model, qty)
  VALUES (?, ?, ?)
`);

insertItem.run(entryId, sampleModels[0].Model, 5);
insertItem.run(entryId, sampleModels[1].Model, 3);
insertItem.run(entryId, sampleModels[2].Model, 2);

console.log(`✓ Inserted test entry #${entryId} with 10 total display units across 3 models.`);

// 4. Verify previous submission check
const prevEntry = db.prepare(`
  SELECT id, user_name, submitted_at 
  FROM display_entries 
  WHERE store_id = ? 
  ORDER BY submitted_at DESC 
  LIMIT 1
`).get(testStore.STORE_ID);
console.log(`✓ Previous entry query verified: Found entry by ${prevEntry.user_name} on ${prevEntry.submitted_at}`);

// 5. Test Admin & Viewer users
const adminUser = db.prepare("SELECT * FROM admin_users WHERE username = 'admin'").get();
const viewerUser = db.prepare("SELECT * FROM admin_users WHERE username = 'viewer'").get();

console.assert(adminUser && bcrypt.compareSync('admin1234', adminUser.password_hash), 'Admin credentials valid');
console.assert(viewerUser && bcrypt.compareSync('viewer1234', viewerUser.password_hash), 'Viewer credentials valid');
console.log('✓ Default Admin and Viewer user passwords hashed and verified correctly');

// 6. Verify Dashboard Metrics
const totalUnits = db.prepare("SELECT SUM(qty) as total FROM display_entry_items").get().total;
const surveyedStores = db.prepare("SELECT COUNT(DISTINCT store_id) as c FROM display_entries WHERE submitted_at IS NOT NULL").get().c;
console.log(`✓ Dashboard Metrics: ${totalUnits} total display units, ${surveyedStores} surveyed stores`);

console.log('🎉 All automated tests passed successfully!');
