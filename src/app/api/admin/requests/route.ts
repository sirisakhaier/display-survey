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
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    const db = getDb();

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (
        dr.model_name LIKE ? OR 
        dr.user_name LIKE ? OR 
        dr.user_phone LIKE ? OR 
        dr.remark LIKE ? OR 
        s.Store_Name_TH LIKE ? OR 
        s.STORE_NAME LIKE ? OR 
        s.STORE_ID LIKE ? OR
        s.Customer LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s, s, s);
    }

    if (customer && customer !== 'all') {
      whereClause += " AND s.Customer = ?";
      params.push(customer);
    }

    if (region && region !== 'all') {
      whereClause += " AND s.Region_TH = ?";
      params.push(region);
    }

    if (status && status !== 'all') {
      whereClause += " AND dr.status = ?";
      params.push(status);
    }

    if (startDate) {
      whereClause += " AND date(dr.created_at) >= date(?)";
      params.push(startDate);
    }

    if (endDate) {
      whereClause += " AND date(dr.created_at) <= date(?)";
      params.push(endDate);
    }

    // 1. KPI Counts
    const kpiRow = db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN dr.status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN dr.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN dr.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
        COALESCE(SUM(dr.quantity), 0) as total_units_requested
      FROM display_requests dr
      JOIN stores s ON dr.store_id = s.STORE_ID
    `).get() as any;

    // 2. Count Filtered Records
    const countRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM display_requests dr
      JOIN stores s ON dr.store_id = s.STORE_ID
      ${whereClause}
    `).get(...params) as { count: number };
    const totalCount = countRow?.count || 0;

    // 3. Fetch Paginated Requests
    const query = `
      SELECT 
        dr.id,
        dr.entry_id,
        dr.store_id,
        COALESCE(dr.user_name, de.user_name) as user_name,
        COALESCE(dr.user_phone, de.user_phone) as user_phone,
        dr.model_name,
        dr.quantity,
        dr.remark,
        dr.picture_url,
        dr.status,
        dr.created_at,
        s.Customer,
        s.STORE_NAME,
        s.Store_Name_TH,
        s.Province_TH,
        s.Region_TH,
        s.Store_ID_Customer
      FROM display_requests dr
      JOIN stores s ON dr.store_id = s.STORE_ID
      LEFT JOIN display_entries de ON dr.entry_id = de.id
      ${whereClause}
      ORDER BY dr.created_at DESC, dr.id DESC
      LIMIT ? OFFSET ?
    `;

    const requests = db.prepare(query).all(...params, limit, offset);

    return NextResponse.json({
      success: true,
      kpi: {
        totalRequests: kpiRow?.total_requests || 0,
        pendingCount: kpiRow?.pending_count || 0,
        approvedCount: kpiRow?.approved_count || 0,
        rejectedCount: kpiRow?.rejected_count || 0,
        totalUnitsRequested: kpiRow?.total_units_requested || 0,
      },
      requests,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin display requests:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลรายการขอสินค้าตัวโชว์ได้' },
      { status: 500 }
    );
  }
}
