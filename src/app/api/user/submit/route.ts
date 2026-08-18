import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { store_id, user_name, user_phone, items, display_requests = [], is_draft = false } = body;

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

    // Validate display requests (if any provided)
    if (Array.isArray(display_requests)) {
      for (let i = 0; i < display_requests.length; i++) {
        const reqItem = display_requests[i];
        if (!reqItem.model_name || !reqItem.model_name.trim()) {
          return NextResponse.json(
            { success: false, error: `กรุณาระบุชื่อรุ่นสำหรับรายการขอสินค้าตัวโชว์ที่ #${i + 1}` },
            { status: 400 }
          );
        }
        if (!reqItem.picture_base64 && !reqItem.picture_url) {
          return NextResponse.json(
            { success: false, error: `กรุณาแนบรูปถ่ายพื้นที่ตั้งโชว์สำหรับรุ่น [${reqItem.model_name}]` },
            { status: 400 }
          );
        }
      }
    }

    const db = getDb();

    // Verify store exists
    const store = db.prepare('SELECT STORE_ID, Store_Name_TH FROM stores WHERE STORE_ID = ?').get(store_id);
    if (!store) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสสาขาในระบบ' }, { status: 404 });
    }

    const submittedAt = is_draft ? null : new Date().toISOString();

    // Prepare upload directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'requests');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const saveTransaction = db.transaction(() => {
      // 1. Insert display_entries record
      const insertEntry = db.prepare(`
        INSERT INTO display_entries (store_id, user_name, user_phone, submitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      const result = insertEntry.run(store_id, user_name.trim(), cleanPhone, submittedAt);
      const entryId = Number(result.lastInsertRowid);

      // 2. Insert survey count items
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

      // 3. Insert display model requests (ขอสินค้าตัวโชว์)
      const insertRequest = db.prepare(`
        INSERT INTO display_requests (entry_id, store_id, model_name, quantity, remark, picture_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      let requestCount = 0;
      if (Array.isArray(display_requests) && display_requests.length > 0) {
        display_requests.forEach((reqItem, idx) => {
          let pictureUrl = reqItem.picture_url || '';

          // Save base64 image to file on disk
          if (reqItem.picture_base64 && typeof reqItem.picture_base64 === 'string') {
            try {
              const base64Data = reqItem.picture_base64.replace(/^data:image\/\w+;base64,/, '');
              const filename = `req_${entryId}_${idx + 1}_${Date.now()}.jpg`;
              const filePath = path.join(uploadsDir, filename);
              fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
              pictureUrl = `/uploads/requests/${filename}`;
            } catch (err) {
              console.error('Error saving uploaded picture:', err);
            }
          }

          const qty = Math.max(1, parseInt(reqItem.quantity, 10) || 1);
          insertRequest.run(
            entryId,
            store_id,
            reqItem.model_name.trim(),
            qty,
            (reqItem.remark || '').trim(),
            pictureUrl
          );
          requestCount++;
        });
      }

      return { entryId, totalQty, recordedModelsCount, requestCount };
    });

    const { entryId, totalQty, recordedModelsCount, requestCount } = saveTransaction();

    return NextResponse.json({
      success: true,
      entryId,
      totalQty,
      recordedModelsCount,
      requestCount,
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
