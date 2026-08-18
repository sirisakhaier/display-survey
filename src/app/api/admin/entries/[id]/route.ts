import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser, authorizeAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const entryId = parseInt(params.id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ success: false, error: 'Invalid entry ID' }, { status: 400 });
    }

    const db = getDb();

    // 1. Get Entry Info
    const entry = db.prepare(`
      SELECT 
        de.id,
        de.store_id,
        de.user_name,
        de.user_phone,
        de.submitted_at,
        de.created_at,
        s.Customer,
        s.STORE_NAME,
        s.Store_Name_TH,
        s.Province_TH,
        s.Region_TH
      FROM display_entries de
      JOIN stores s ON de.store_id = s.STORE_ID
      WHERE de.id = ?
    `).get(entryId);

    if (!entry) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการที่ต้องการ' }, { status: 404 });
    }

    // 2. Get Items for this entry
    const items = db.prepare(`
      SELECT 
        dei.id,
        dei.model,
        dei.qty,
        dei.updated_at,
        m.Brand,
        m.Category,
        m.SubCategory
      FROM display_entry_items dei
      LEFT JOIN models m ON dei.model = m.Model
      WHERE dei.entry_id = ?
      ORDER BY m.Category ASC, m.Brand ASC, dei.qty DESC, dei.model ASC
    `).all(entryId);

    // 3. Get Display Model Requests (ขอสินค้าตัวโชว์)
    const requests = db.prepare(`
      SELECT 
        id,
        model_name,
        quantity,
        remark,
        picture_url,
        status,
        created_at
      FROM display_requests
      WHERE entry_id = ?
      ORDER BY id ASC
    `).all(entryId);

    return NextResponse.json({
      success: true,
      entry,
      items,
      requests,
    });
  } catch (error: any) {
    console.error('Error fetching entry details:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลรายละเอียดได้' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Enforce ADMIN ONLY at backend level (Viewer -> HTTP 403)
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const entryId = parseInt(params.id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ success: false, error: 'Invalid entry ID' }, { status: 400 });
    }

    const db = getDb();
    const deleteEntry = db.prepare('DELETE FROM display_entries WHERE id = ?');
    const result = deleteEntry.run(entryId);

    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'ลบรายการสำเร็จ',
    });
  } catch (error: any) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบรายการ' },
      { status: 500 }
    );
  }
}
