import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const requestId = parseInt(params.id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ success: false, error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status, remark } = body;

    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 });
    }

    const db = getDb();

    let query = "UPDATE display_requests SET ";
    const updateParams: any[] = [];
    const fields: string[] = [];

    if (status) {
      fields.push("status = ?");
      updateParams.push(status);
    }

    if (remark !== undefined) {
      fields.push("remark = ?");
      updateParams.push(remark);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    query += fields.join(", ") + " WHERE id = ?";
    updateParams.push(requestId);

    const result = db.prepare(query).run(...updateParams);
    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการที่ต้องการแก้ไข' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตสถานะสำเร็จ',
    });
  } catch (error: any) {
    console.error('Error updating display request:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const requestId = parseInt(params.id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ success: false, error: 'Invalid request ID' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare('DELETE FROM display_requests WHERE id = ?').run(requestId);

    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'ลบรายการสำเร็จ',
    });
  } catch (error: any) {
    console.error('Error deleting display request:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบรายการ' },
      { status: 500 }
    );
  }
}
