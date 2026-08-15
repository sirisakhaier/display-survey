import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT id, user_name, action, dimension_type, details, created_at
      FROM dimension_logs
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching dimension logs:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงประวัติการแก้ไขได้' },
      { status: 500 }
    );
  }
}
