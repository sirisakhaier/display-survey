import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const customer = searchParams.get('customer');
    const region = searchParams.get('region');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const db = getDb();

    let whereClause = "WHERE de.submitted_at IS NOT NULL";
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (
        de.user_name LIKE ? OR 
        de.user_phone LIKE ? OR 
        s.Store_Name_TH LIKE ? OR 
        s.STORE_NAME LIKE ? OR 
        s.STORE_ID LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    if (customer && customer !== 'all') {
      whereClause += " AND s.Customer = ?";
      params.push(customer);
    }

    if (region && region !== 'all') {
      whereClause += " AND s.Region_TH = ?";
      params.push(region);
    }

    if (startDate) {
      whereClause += " AND date(de.submitted_at) >= date(?)";
      params.push(startDate);
    }

    if (endDate) {
      whereClause += " AND date(de.submitted_at) <= date(?)";
      params.push(endDate);
    }

    // Count total records
    const countRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM display_entries de
      JOIN stores s ON de.store_id = s.STORE_ID
      ${whereClause}
    `).get(...params) as { count: number };
    const totalCount = countRow.count || 0;

    // Fetch entries
    let query = `
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
        s.Region_TH,
        COUNT(DISTINCT dei.model) as total_models,
        COALESCE(SUM(dei.qty), 0) as total_qty
      FROM display_entries de
      JOIN stores s ON de.store_id = s.STORE_ID
      LEFT JOIN display_entry_items dei ON de.id = dei.entry_id
      ${whereClause}
      GROUP BY de.id
      ORDER BY de.submitted_at DESC
    `;

    if (!isExport) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const entries = db.prepare(query).all(...params);

    return NextResponse.json({
      success: true,
      entries,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching display entries:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลรายการที่บันทึกได้' },
      { status: 500 }
    );
  }
}
