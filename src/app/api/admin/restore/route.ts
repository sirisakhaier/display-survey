import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { stores, models, entries, entryItems, requests } = body;

    if (!stores || !models) {
      return NextResponse.json(
        { success: false, error: 'ไฟล์สำรองข้อมูลไม่ถูกต้อง (ไม่พบข้อมูล stores หรือ models)' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Execute in a single atomic transaction
    const restoreTransaction = db.transaction(() => {
      // 1. Restore Stores
      if (Array.isArray(stores) && stores.length > 0) {
        db.exec('DELETE FROM stores');
        const insertStore = db.prepare(`
          INSERT INTO stores (
            STORE_ID, Customer, Store_ID_Customer, STORE_NAME, Store_Name_TH, Province_TH, Region_TH, Active_Inactive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of stores) {
          insertStore.run(
            s.STORE_ID,
            s.Customer,
            s.Store_ID_Customer || null,
            s.STORE_NAME || null,
            s.Store_Name_TH,
            s.Province_TH,
            s.Region_TH,
            s.Active_Inactive || 'Active'
          );
        }
      }

      // 2. Restore Models
      if (Array.isArray(models) && models.length > 0) {
        db.exec('DELETE FROM models');
        const insertModel = db.prepare(`
          INSERT INTO models (
            Model, Brand, Category, SubCategory, Active_Inactive, Remark, Update_by, Update_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of models) {
          insertModel.run(
            m.Model,
            m.Brand,
            m.Category,
            m.SubCategory || null,
            m.Active_Inactive || 'Active',
            m.Remark || null,
            m.Update_by || 'restore',
            m.Update_date || new Date().toISOString()
          );
        }
      }

      // 3. Restore Entries & Entry Items
      if (Array.isArray(entries)) {
        db.exec('DELETE FROM display_entries');
        db.exec('DELETE FROM display_entry_items');

        const insertEntry = db.prepare(`
          INSERT INTO display_entries (
            id, store_id, user_name, user_phone, submitted_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const e of entries) {
          insertEntry.run(
            e.id,
            e.store_id,
            e.user_name,
            e.user_phone,
            e.submitted_at || null,
            e.created_at || new Date().toISOString()
          );
        }

        if (Array.isArray(entryItems)) {
          const insertItem = db.prepare(`
            INSERT INTO display_entry_items (
              id, entry_id, model, qty, updated_at
            ) VALUES (?, ?, ?, ?, ?)
          `);
          for (const item of entryItems) {
            insertItem.run(
              item.id,
              item.entry_id,
              item.model,
              item.qty,
              item.updated_at || new Date().toISOString()
            );
          }
        }
      }

      // 4. Restore Requests
      if (Array.isArray(requests)) {
        db.exec('DELETE FROM display_requests');
        const insertReq = db.prepare(`
          INSERT INTO display_requests (
            id, entry_id, store_id, user_name, user_phone, model_name, quantity, remark, picture_url, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of requests) {
          insertReq.run(
            r.id,
            r.entry_id || null,
            r.store_id,
            r.user_name || '',
            r.user_phone || '',
            r.model_name,
            r.quantity || 1,
            r.remark || null,
            r.picture_url || null,
            r.status || 'Pending',
            r.created_at || new Date().toISOString()
          );
        }
      }
    });

    restoreTransaction();

    return NextResponse.json({
      success: true,
      message: 'กู้คืนข้อมูลทั้งหมดสำเร็จสมบูรณ์!',
      restored: {
        stores: stores?.length || 0,
        models: models?.length || 0,
        entries: entries?.length || 0,
        entryItems: entryItems?.length || 0,
        requests: requests?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + error.message },
      { status: 500 }
    );
  }
}
