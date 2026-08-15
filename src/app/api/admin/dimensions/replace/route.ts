import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth';
import Papa from 'papaparse';
import { normalizeCategory, cleanSubCategory } from '@/lib/normalize';

export async function POST(req: NextRequest) {
  // Enforce ADMIN ONLY at backend level (Viewer -> HTTP 403)
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { type, csvContent, isPreview = true } = body;

    if (!type || !['store', 'model'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Dimension type must be "store" or "model"' }, { status: 400 });
    }

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุเนื้อหาไฟล์ CSV' }, { status: 400 });
    }

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      const firstError = parsed.errors[0];
      return NextResponse.json({
        success: false,
        error: `รูปแบบไฟล์ CSV ไม่ถูกต้อง: ${firstError.message} (บรรทัด ${firstError.row})`,
      }, { status: 400 });
    }

    const rows = parsed.data as any[];
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไฟล์ CSV ไม่มีข้อมูล' }, { status: 400 });
    }

    const db = getDb();
    const username = user?.username || 'admin';

    // -------------------------------------------------------------
    // STORE REPLACEMENT VALIDATION & PROCESSING
    // -------------------------------------------------------------
    if (type === 'store') {
      const requiredCols = ['Customer', 'STORE_ID', 'Store Name TH', 'Region TH'];
      const headers = Object.keys(rows[0] || {});
      const missingCols = requiredCols.filter((col) => !headers.includes(col) && !headers.some((h) => h.toLowerCase() === col.toLowerCase()));
      if (missingCols.length > 0) {
        return NextResponse.json({
          success: false,
          error: `ไฟล์ CSV ขาดคอลัมน์สำคัญ: ${missingCols.join(', ')}`,
        }, { status: 400 });
      }

      // Check duplicate STORE_ID in upload file
      const storeIdSet = new Set<string>();
      const duplicateIds: string[] = [];
      const validStoreIds: string[] = [];

      for (const row of rows) {
        const id = (row['STORE_ID'] || row['store_id'] || '').trim();
        if (id) {
          if (storeIdSet.has(id)) {
            duplicateIds.push(id);
          } else {
            storeIdSet.add(id);
            validStoreIds.push(id);
          }
        }
      }

      if (duplicateIds.length > 0) {
        return NextResponse.json({
          success: false,
          error: `พบ STORE_ID ซ้ำกันในไฟล์: ${duplicateIds.slice(0, 5).join(', ')}${duplicateIds.length > 5 ? ` และอีก ${duplicateIds.length - 5} รายการ` : ''}`,
        }, { status: 400 });
      }

      // Check referenced stores that are missing from the new file
      const historicalStores = db.prepare(`
        SELECT DISTINCT store_id 
        FROM display_entries
      `).all() as { store_id: string }[];

      const missingHistorical = historicalStores
        .map((h) => h.store_id)
        .filter((id) => !storeIdSet.has(id));

      if (isPreview) {
        return NextResponse.json({
          success: true,
          preview: {
            type: 'store',
            totalRows: rows.length,
            validCount: validStoreIds.length,
            sampleRows: rows.slice(0, 5),
            missingHistoricalCount: missingHistorical.length,
            missingHistoricalSample: missingHistorical.slice(0, 10),
            hasMissingHistoricalWarning: missingHistorical.length > 0,
          },
        });
      }

      // Execute Replacement in Transaction
      const replaceStores = db.transaction(() => {
        // Delete existing stores (Foreign keys in display_entries remain as historical records)
        db.prepare('DELETE FROM stores').run();

        const insertStmt = db.prepare(`
          INSERT INTO stores (
            STORE_ID, Customer, Store_ID_Customer, STORE_NAME, Store_Name_TH, Province_TH, Region_TH, Active_Inactive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        for (const row of rows) {
          const storeId = (row['STORE_ID'] || row['store_id'] || '').trim();
          const customer = (row['Customer'] || row['customer'] || '').trim();
          if (!storeId || !customer) continue;

          const storeIdCustomer = (row['Store ID Customer'] || row['store_id_customer'] || '').trim();
          const storeName = (row['STORE_NAME'] || row['store_name'] || '').trim();
          const storeNameTh = (row['Store Name TH'] || row['store_name_th'] || storeName || storeId).trim();
          const provinceTh = (row['Province TH'] || row['province_th'] || '').trim();
          const regionTh = (row['Region TH'] || row['region_th'] || '').trim();
          const activeInactive = (row['Active-Inactive'] || row['active_inactive'] || 'Active').trim() === 'Active' ? 'Active' : 'Not active';

          insertStmt.run(
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

        db.prepare(`
          INSERT INTO dimension_logs (user_name, action, dimension_type, details)
          VALUES (?, 'REPLACE_ALL', 'store', ?)
        `).run(username, `Replaced all stores with ${count} records from uploaded CSV`);

        return count;
      });

      const count = replaceStores();

      return NextResponse.json({
        success: true,
        message: `แทนที่ข้อมูลร้านค้าเรียบร้อยแล้ว (${count} สาขา)`,
        count,
      });
    }

    // -------------------------------------------------------------
    // MODEL REPLACEMENT VALIDATION & PROCESSING
    // -------------------------------------------------------------
    if (type === 'model') {
      const requiredCols = ['Model', 'Brand', 'Category'];
      const headers = Object.keys(rows[0] || {});
      const missingCols = requiredCols.filter((col) => !headers.includes(col) && !headers.some((h) => h.toLowerCase() === col.toLowerCase()));
      if (missingCols.length > 0) {
        return NextResponse.json({
          success: false,
          error: `ไฟล์ CSV ขาดคอลัมน์สำคัญ: ${missingCols.join(', ')}`,
        }, { status: 400 });
      }

      // Check duplicate Model PK in upload file
      const modelSet = new Set<string>();
      const duplicateModels: string[] = [];
      const validModels: string[] = [];

      for (const row of rows) {
        const m = (row['Model'] || row['model'] || '').trim();
        if (m) {
          if (modelSet.has(m)) {
            duplicateModels.push(m);
          } else {
            modelSet.add(m);
            validModels.push(m);
          }
        }
      }

      if (duplicateModels.length > 0) {
        return NextResponse.json({
          success: false,
          error: `พบ Model ซ้ำกันในไฟล์: ${duplicateModels.slice(0, 5).join(', ')}${duplicateModels.length > 5 ? ` และอีก ${duplicateModels.length - 5} รายการ` : ''}`,
        }, { status: 400 });
      }

      // Check referenced models missing from new file
      const historicalModels = db.prepare(`
        SELECT DISTINCT model 
        FROM display_entry_items
      `).all() as { model: string }[];

      const missingHistorical = historicalModels
        .map((h) => h.model)
        .filter((m) => !modelSet.has(m));

      if (isPreview) {
        return NextResponse.json({
          success: true,
          preview: {
            type: 'model',
            totalRows: rows.length,
            validCount: validModels.length,
            sampleRows: rows.slice(0, 5),
            missingHistoricalCount: missingHistorical.length,
            missingHistoricalSample: missingHistorical.slice(0, 10),
            hasMissingHistoricalWarning: missingHistorical.length > 0,
          },
        });
      }

      // Execute Model Replacement in Transaction
      const replaceModels = db.transaction(() => {
        db.prepare('DELETE FROM models').run();

        const insertStmt = db.prepare(`
          INSERT INTO models (
            Model, Brand, Category, SubCategory, Active_Inactive, Remark, Update_by, Update_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        const now = new Date().toLocaleDateString('en-GB');

        for (const row of rows) {
          const model = (row['Model'] || row['model'] || '').trim();
          const brand = (row['Brand'] || row['brand'] || '').trim();
          if (!model || !brand) continue;

          const category = normalizeCategory(row['Category'] || row['category']);
          const subCategory = cleanSubCategory(row['SubCategory'] || row['subcategory'] || row['sub_category']);
          const activeInactive = (row['Active-Inactive'] || row['active_inactive'] || 'Active').trim() === 'Active' ? 'Active' : 'Not active';
          const remark = (row['Remark'] || row['remark'] || '').trim();
          const updateBy = (row['Update by'] || username).trim();
          const updateDate = (row['Update date'] || now).trim();

          insertStmt.run(
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

        db.prepare(`
          INSERT INTO dimension_logs (user_name, action, dimension_type, details)
          VALUES (?, 'REPLACE_ALL', 'model', ?)
        `).run(username, `Replaced all models with ${count} records from uploaded CSV`);

        return count;
      });

      const count = replaceModels();

      return NextResponse.json({
        success: true,
        message: `แทนที่ข้อมูลรุ่นสินค้าเรียบร้อยแล้ว (${count} รายการ)`,
        count,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid dimension type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error replacing dimension CSV:', error);
    return NextResponse.json(
      { success: false, error: `เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ${error.message}` },
      { status: 500 }
    );
  }
}
