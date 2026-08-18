import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser, authorizeAdmin } from '@/lib/auth';

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
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const db = getDb();
    const isSummary = searchParams.get('summary') === 'true';

    if (isSummary) {
      const customerStats = db.prepare(`
        SELECT 
          Customer as customer,
          COUNT(*) as total,
          SUM(CASE WHEN Active_Inactive = 'Active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN Active_Inactive != 'Active' THEN 1 ELSE 0 END) as inactive
        FROM stores
        WHERE Customer IS NOT NULL AND Customer != ''
        GROUP BY Customer
        ORDER BY Customer ASC
      `).all();

      return NextResponse.json({
        success: true,
        customerStats,
      });
    }

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (
        STORE_ID LIKE ? OR 
        STORE_NAME LIKE ? OR 
        Store_Name_TH LIKE ? OR 
        Province_TH LIKE ? OR
        Store_ID_Customer LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    if (customer && customer !== 'all') {
      whereClause += " AND Customer = ?";
      params.push(customer);
    }

    if (region && region !== 'all') {
      whereClause += " AND Region_TH = ?";
      params.push(region);
    }

    if (status && status !== 'all') {
      whereClause += " AND Active_Inactive = ?";
      params.push(status);
    }

    // Count
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM stores ${whereClause}`).get(...params) as { count: number };
    const total = countRow.count || 0;

    let query = `
      SELECT Customer, Store_ID_Customer, STORE_ID, STORE_NAME, Store_Name_TH, Province_TH, Region_TH, Active_Inactive
      FROM stores
      ${whereClause}
      ORDER BY Customer ASC, Province_TH ASC, Store_Name_TH ASC
    `;

    if (!isExport) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const stores = db.prepare(query).all(...params);

    // Get filter options
    const distinctCustomers = db.prepare('SELECT DISTINCT Customer FROM stores ORDER BY Customer ASC').all() as { Customer: string }[];
    const distinctRegions = db.prepare('SELECT DISTINCT Region_TH FROM stores ORDER BY Region_TH ASC').all() as { Region_TH: string }[];

    return NextResponse.json({
      success: true,
      stores,
      filters: {
        customers: distinctCustomers.map((c) => c.Customer),
        regions: distinctRegions.map((r) => r.Region_TH),
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching dimension stores:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลร้านค้าได้' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  // Enforce ADMIN ONLY (Viewer -> 403 Forbidden)
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { storeId, storeIds, customer, region, status } = body;

    if (!status || !['Active', 'Not active'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'สถานะไม่ถูกต้อง (ต้องเป็น Active หรือ Not active)' },
        { status: 400 }
      );
    }

    const db = getDb();
    let updatedCount = 0;
    let logDetail = '';

    // 1. Single Store update
    if (storeId) {
      const res = db.prepare('UPDATE stores SET Active_Inactive = ? WHERE STORE_ID = ?').run(status, storeId);
      updatedCount = res.changes;
      logDetail = `Update Store [${storeId}] status to ${status}`;
    }
    // 2. Multiple Store IDs update
    else if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
      const updateMany = db.transaction((ids: string[]) => {
        let count = 0;
        const stmt = db.prepare('UPDATE stores SET Active_Inactive = ? WHERE STORE_ID = ?');
        for (const id of ids) {
          const res = stmt.run(status, id);
          count += res.changes;
        }
        return count;
      });
      updatedCount = updateMany(storeIds);
      logDetail = `Bulk update ${updatedCount} stores to ${status}`;
    }
    // 3. By Customer
    else if (customer) {
      const res = db.prepare('UPDATE stores SET Active_Inactive = ? WHERE TRIM(Customer) = TRIM(?) COLLATE NOCASE').run(status, customer);
      updatedCount = res.changes;
      logDetail = `Bulk update all stores for Customer [${customer}] to ${status} (${updatedCount} stores)`;
    }
    // 4. By Region
    else if (region) {
      const res = db.prepare('UPDATE stores SET Active_Inactive = ? WHERE TRIM(Region_TH) = TRIM(?) COLLATE NOCASE').run(status, region);
      updatedCount = res.changes;
      logDetail = `Bulk update all stores in Region [${region}] to ${status} (${updatedCount} stores)`;
    }
    // 5. All Stores
    else if (body.all) {
      const res = db.prepare('UPDATE stores SET Active_Inactive = ?').run(status);
      updatedCount = res.changes;
      logDetail = `Bulk update ALL stores to ${status} (${updatedCount} stores)`;
    } else {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุสาขา ลูกค้า หรือภูมิภาคที่ต้องการแก้ไข' },
        { status: 400 }
      );
    }

    // Record audit log
    db.prepare(`
      INSERT INTO dimension_logs (user_name, action, dimension_type, details)
      VALUES (?, 'UPDATE_STATUS', 'store', ?)
    `).run(user?.username || 'admin', logDetail);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `อัปเดตสถานะสำเร็จ (${updatedCount} สาขา)`,
    });
  } catch (error: any) {
    console.error('Error updating store dimension:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะร้านค้า' },
      { status: 500 }
    );
  }
}
