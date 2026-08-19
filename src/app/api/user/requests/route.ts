import { NextRequest, NextResponse } from 'next/server';
import { getDb, REQUESTS_UPLOADS_DIR } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { store_id, user_name, user_phone, requests = [] } = body;

    // 1. Validation
    if (!store_id || typeof store_id !== 'string') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุสาขา' }, { status: 400 });
    }

    if (!user_name || typeof user_name !== 'string' || user_name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ-นามสกุลผู้ขอ' }, { status: 400 });
    }

    const cleanPhone = (user_phone || '').replace(/\D/g, '');
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมีครบ 10 หลัก (เช่น 0812345678)' },
        { status: 400 }
      );
    }

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเพิ่มรายการขอสินค้าตัวโชว์อย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    for (let i = 0; i < requests.length; i++) {
      const item = requests[i];
      if (!item.model_name || !item.model_name.trim()) {
        return NextResponse.json(
          { success: false, error: `กรุณาระบุชื่อรุ่นสำหรับรายการที่ #${i + 1}` },
          { status: 400 }
        );
      }
      if (!item.picture_base64 && !item.picture_url) {
        return NextResponse.json(
          { success: false, error: `กรุณาถ่ายรูปหรือแนบรูปถ่ายพื้นที่ตั้งโชว์ สำหรับรุ่น [${item.model_name}]` },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    // Verify store exists
    const store = db.prepare('SELECT STORE_ID, Store_Name_TH FROM stores WHERE STORE_ID = ?').get(store_id);
    if (!store) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสสาขาในระบบ' }, { status: 404 });
    }

    // Ensure uploads directories exist
    const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'requests');
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }
    if (!fs.existsSync(REQUESTS_UPLOADS_DIR)) {
      fs.mkdirSync(REQUESTS_UPLOADS_DIR, { recursive: true });
    }

    const insertRequest = db.prepare(`
      INSERT INTO display_requests (store_id, user_name, user_phone, model_name, quantity, remark, picture_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `);

    const insertedIds: number[] = [];

    const saveTransaction = db.transaction(() => {
      requests.forEach((reqItem, idx) => {
        let pictureUrl = reqItem.picture_url || '';

        // Save base64 image to file on disk
        if (reqItem.picture_base64 && typeof reqItem.picture_base64 === 'string') {
          try {
            const base64Data = reqItem.picture_base64.replace(/^data:image\/\w+;base64,/, '');
            const filename = `req_standalone_${Date.now()}_${idx + 1}_${Math.random().toString(36).slice(2, 6)}.jpg`;
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Save to persistent storage directory
            fs.writeFileSync(path.join(REQUESTS_UPLOADS_DIR, filename), imageBuffer);
            
            // Also write to public uploads directory if different
            try {
              if (path.resolve(publicUploadsDir) !== path.resolve(REQUESTS_UPLOADS_DIR)) {
                fs.writeFileSync(path.join(publicUploadsDir, filename), imageBuffer);
              }
            } catch {}

            pictureUrl = `/uploads/requests/${filename}`;
          } catch (err) {
            console.error('Error saving standalone request picture:', err);
          }
        }

        const qty = Math.max(1, parseInt(reqItem.quantity, 10) || 1);
        const result = insertRequest.run(
          store_id,
          user_name.trim(),
          cleanPhone,
          reqItem.model_name.trim(),
          qty,
          (reqItem.remark || '').trim(),
          pictureUrl
        );
        insertedIds.push(Number(result.lastInsertRowid));
      });
    });

    saveTransaction();

    return NextResponse.json({
      success: true,
      insertedCount: insertedIds.length,
      message: `ส่งคำขอสินค้าตัวโชว์จำนวน ${insertedIds.length} รายการสำเร็จ`,
    });
  } catch (error: any) {
    console.error('Error submitting display requests:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกคำขอ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
