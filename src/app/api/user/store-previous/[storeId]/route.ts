import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const storeId = params.storeId;
    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store ID is required' }, { status: 400 });
    }

    const db = getDb();

    // Check latest entry for this store
    const latestEntry = db.prepare(`
      SELECT id, store_id, user_name, user_phone, submitted_at, updated_at
      FROM display_entries
      WHERE store_id = ?
      ORDER BY COALESCE(submitted_at, updated_at) DESC
      LIMIT 1
    `).get(storeId) as any;

    // Fetch previous display requests for this store
    const previousRequests = db.prepare(`
      SELECT id, model_name, quantity, remark, picture_url, status, user_name, user_phone, created_at
      FROM display_requests
      WHERE store_id = ?
      ORDER BY created_at DESC
    `).all(storeId) as any[];

    if (!latestEntry) {
      return NextResponse.json({
        success: true,
        hasPrevious: false,
        entry: null,
        items: {},
        itemDetails: [],
        categorySummary: [],
        previousRequests,
        hasPreviousRequests: previousRequests.length > 0,
        totalQty: 0,
        totalModels: 0,
      });
    }

    // Get item details with Category, Brand, SubCategory
    const items = db.prepare(`
      SELECT 
        dei.model,
        dei.qty,
        COALESCE(m.Brand, 'Unknown') as Brand,
        COALESCE(m.Category, 'Other') as Category,
        COALESCE(m.SubCategory, '') as SubCategory
      FROM display_entry_items dei
      LEFT JOIN models m ON dei.model = m.Model
      WHERE dei.entry_id = ? AND dei.qty > 0
      ORDER BY m.Category ASC, m.Brand ASC, dei.qty DESC, dei.model ASC
    `).all(latestEntry.id) as { model: string; qty: number; Brand: string; Category: string; SubCategory: string }[];

    const itemMap: Record<string, number> = {};
    let totalQty = 0;

    items.forEach((item) => {
      itemMap[item.model] = item.qty;
      totalQty += item.qty;
    });

    // Category and Brand breakdown summary
    const categorySummary = db.prepare(`
      SELECT 
        COALESCE(m.Category, 'Other') as Category,
        COALESCE(m.Brand, 'Unknown') as Brand,
        COUNT(DISTINCT dei.model) as model_count,
        SUM(dei.qty) as total_qty
      FROM display_entry_items dei
      LEFT JOIN models m ON dei.model = m.Model
      WHERE dei.entry_id = ? AND dei.qty > 0
      GROUP BY m.Category, m.Brand
      ORDER BY total_qty DESC
    `).all(latestEntry.id);

    return NextResponse.json({
      success: true,
      hasPrevious: true,
      entry: {
        id: latestEntry.id,
        user_name: latestEntry.user_name,
        user_phone: latestEntry.user_phone,
        submitted_at: latestEntry.submitted_at || latestEntry.updated_at,
      },
      items: itemMap,
      itemDetails: items,
      categorySummary,
      previousRequests,
      hasPreviousRequests: previousRequests.length > 0,
      totalQty,
      totalModels: items.length,
    });
  } catch (error: any) {
    console.error('Error fetching store previous entry:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลก่อนหน้าได้' },
      { status: 500 }
    );
  }
}
