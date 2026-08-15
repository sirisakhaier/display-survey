import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customer = searchParams.get('customer');
    const region = searchParams.get('region');

    const db = getDb();

    // 1. Total Active Stores filter condition
    let storeWhere = "WHERE s.Active_Inactive = 'Active'";
    const storeParams: any[] = [];

    if (customer && customer !== 'all') {
      storeWhere += " AND s.Customer = ?";
      storeParams.push(customer);
    }
    if (region && region !== 'all') {
      storeWhere += " AND s.Region_TH = ?";
      storeParams.push(region);
    }

    const totalStoresRow = db.prepare(`
      SELECT COUNT(*) as count FROM stores s ${storeWhere}
    `).get(...storeParams) as { count: number };
    const totalActiveStores = totalStoresRow.count || 0;

    // 2. Entries filter condition for submitted entries
    let entryWhere = "WHERE de.submitted_at IS NOT NULL";
    const entryParams: any[] = [];

    if (startDate) {
      entryWhere += " AND date(de.submitted_at) >= date(?)";
      entryParams.push(startDate);
    }
    if (endDate) {
      entryWhere += " AND date(de.submitted_at) <= date(?)";
      entryParams.push(endDate);
    }
    if (customer && customer !== 'all') {
      entryWhere += " AND s.Customer = ?";
      entryParams.push(customer);
    }
    if (region && region !== 'all') {
      entryWhere += " AND s.Region_TH = ?";
      entryParams.push(region);
    }

    // Latest submitted entry per store
    const latestEntriesQuery = `
      SELECT de.id, de.store_id, de.user_name, de.submitted_at, s.Customer, s.Store_Name_TH, s.Province_TH, s.Region_TH
      FROM display_entries de
      JOIN stores s ON de.store_id = s.STORE_ID
      INNER JOIN (
        SELECT store_id, MAX(submitted_at) as max_sub
        FROM display_entries
        WHERE submitted_at IS NOT NULL
        GROUP BY store_id
      ) latest ON de.store_id = latest.store_id AND de.submitted_at = latest.max_sub
      ${entryWhere}
    `;

    const surveyedStoresCountRow = db.prepare(`
      SELECT COUNT(DISTINCT de.store_id) as count
      FROM display_entries de
      JOIN stores s ON de.store_id = s.STORE_ID
      ${entryWhere}
    `).get(...entryParams) as { count: number };
    const surveyedStoresCount = surveyedStoresCountRow.count || 0;
    const pendingStoresCount = Math.max(0, totalActiveStores - surveyedStoresCount);
    const coveragePercentage = totalActiveStores > 0 
      ? Number(((surveyedStoresCount / totalActiveStores) * 100).toFixed(1)) 
      : 0;

    // Total display units counted across matching items
    const totalUnitsRow = db.prepare(`
      SELECT COALESCE(SUM(dei.qty), 0) as total_qty
      FROM display_entry_items dei
      JOIN display_entries de ON dei.entry_id = de.id
      JOIN stores s ON de.store_id = s.STORE_ID
      ${entryWhere}
    `).get(...entryParams) as { total_qty: number };
    const totalDisplayUnits = totalUnitsRow.total_qty || 0;

    // Customer Breakdown
    const customerBreakdown = db.prepare(`
      SELECT 
        s.Customer,
        COUNT(DISTINCT s.STORE_ID) as total_stores,
        COUNT(DISTINCT CASE WHEN de.submitted_at IS NOT NULL THEN de.store_id END) as surveyed_stores,
        COALESCE(SUM(CASE WHEN de.submitted_at IS NOT NULL THEN dei.qty ELSE 0 END), 0) as total_units
      FROM stores s
      LEFT JOIN display_entries de ON s.STORE_ID = de.store_id
      LEFT JOIN display_entry_items dei ON de.id = dei.entry_id
      WHERE s.Active_Inactive = 'Active'
      GROUP BY s.Customer
      ORDER BY total_units DESC, total_stores DESC
    `).all();

    // Region Breakdown
    const regionBreakdown = db.prepare(`
      SELECT 
        s.Region_TH,
        COUNT(DISTINCT s.STORE_ID) as total_stores,
        COUNT(DISTINCT CASE WHEN de.submitted_at IS NOT NULL THEN de.store_id END) as surveyed_stores,
        COALESCE(SUM(CASE WHEN de.submitted_at IS NOT NULL THEN dei.qty ELSE 0 END), 0) as total_units
      FROM stores s
      LEFT JOIN display_entries de ON s.STORE_ID = de.store_id
      LEFT JOIN display_entry_items dei ON de.id = dei.entry_id
      WHERE s.Active_Inactive = 'Active'
      GROUP BY s.Region_TH
      ORDER BY total_units DESC
    `).all();

    // Brand Breakdown (Top 10 brands)
    const brandBreakdown = db.prepare(`
      SELECT 
        m.Brand,
        COALESCE(SUM(dei.qty), 0) as total_qty
      FROM display_entry_items dei
      JOIN display_entries de ON dei.entry_id = de.id
      JOIN stores s ON de.store_id = s.STORE_ID
      JOIN models m ON dei.model = m.Model
      ${entryWhere}
      GROUP BY m.Brand
      HAVING total_qty > 0
      ORDER BY total_qty DESC
      LIMIT 10
    `).all(...entryParams);

    // Category Breakdown
    const categoryBreakdown = db.prepare(`
      SELECT 
        m.Category,
        COALESCE(SUM(dei.qty), 0) as total_qty
      FROM display_entry_items dei
      JOIN display_entries de ON dei.entry_id = de.id
      JOIN stores s ON de.store_id = s.STORE_ID
      JOIN models m ON dei.model = m.Model
      ${entryWhere}
      GROUP BY m.Category
      HAVING total_qty > 0
      ORDER BY total_qty DESC
    `).all(...entryParams);

    // Top 10 Stores with highest display units
    const topStores = db.prepare(`
      SELECT 
        s.STORE_ID,
        s.Customer,
        s.Store_Name_TH,
        s.Province_TH,
        s.Region_TH,
        COALESCE(SUM(dei.qty), 0) as total_units
      FROM display_entry_items dei
      JOIN display_entries de ON dei.entry_id = de.id
      JOIN stores s ON de.store_id = s.STORE_ID
      ${entryWhere}
      GROUP BY s.STORE_ID
      ORDER BY total_units DESC
      LIMIT 10
    `).all(...entryParams);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalActiveStores,
          surveyedStoresCount,
          pendingStoresCount,
          coveragePercentage,
          totalDisplayUnits,
        },
        customerBreakdown,
        regionBreakdown,
        brandBreakdown,
        categoryBreakdown,
        topStores,
      },
    });
  } catch (error: any) {
    console.error('Error in admin dashboard route:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลสรุปแดชบอร์ดได้' },
      { status: 500 }
    );
  }
}
