import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { store_id, user_name, user_phone, items, is_draft = false } = body;

    // 1. Validation
    if (!store_id || typeof store_id !== 'string') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุสาขา' }, { status: 400 });
    }

    if (!user_name || typeof user_name !== 'string' || user_name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ-นามสกุลผู้บันทึก' }, { status: 400 });
    }

    const cleanPhone = (user_phone || '').replace(/\D/g, '');
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมีครบ 10 หลัก (เช่น 0812345678)' },
        { status: 400 }
      );
    }

    if (!items || typeof items !== 'object') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลจำนวนสินค้าไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify store exists
    const store = db.prepare('SELECT STORE_ID, Store_Name_TH FROM stores WHERE STORE_ID = ?').get(store_id);
    if (!store) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสสาขาในระบบ' }, { status: 404 });
    }

    const submittedAt = is_draft ? null : new Date().toISOString();

    const saveTransaction = db.transaction(() => {
      // 1. Insert display_entries record
      const insertEntry = db.prepare(`
        INSERT INTO display_entries (store_id, user_name, user_phone, submitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      const result = insertEntry.run(store_id, user_name.trim(), cleanPhone, submittedAt);
      const entryId = result.lastInsertRowid;

      // 2. Insert items
      const insertItem = db.prepare(`
        INSERT INTO display_entry_items (entry_id, model, qty, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);

      let totalQty = 0;
      let recordedModelsCount = 0;

      for (const [model, rawQty] of Object.entries(items)) {
        const qty = Number(rawQty);
        if (Number.isInteger(qty) && qty >= 0) {
          insertItem.run(entryId, model, qty);
          totalQty += qty;
          recordedModelsCount++;
        }
      }

      return { entryId, totalQty, recordedModelsCount };
    });

    const { entryId, totalQty, recordedModelsCount } = saveTransaction();

    return NextResponse.json({
      success: true,
      entryId,
      totalQty,
      recordedModelsCount,
      submittedAt,
      message: is_draft ? 'บันทึกแบบร่างสำเร็จ' : 'บันทึกข้อมูลการสำรวจสำเร็จ',
    });
  } catch (error: any) {
    console.error('Error submitting display survey:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
