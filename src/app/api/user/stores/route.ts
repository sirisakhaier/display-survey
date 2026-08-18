import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer = searchParams.get('customer');
    const region = searchParams.get('region');

    const db = getDb();

    // 1. If no customer specified, return distinct active customers
    if (!customer) {
      const customers = db.prepare(`
        SELECT DISTINCT Customer 
        FROM stores 
        WHERE LOWER(TRIM(Active_Inactive)) = 'active'
          AND Customer IS NOT NULL 
          AND TRIM(Customer) != ''
        ORDER BY Customer ASC
      `).all() as { Customer: string }[];

      return NextResponse.json({
        success: true,
        customers: customers.map((c) => c.Customer),
      });
    }

    // 2. If customer specified but no region, return distinct active regions for that customer
    if (customer && !region) {
      const regions = db.prepare(`
        SELECT DISTINCT Region_TH 
        FROM stores 
        WHERE TRIM(Customer) = TRIM(?) COLLATE NOCASE 
          AND LOWER(TRIM(Active_Inactive)) = 'active'
          AND Region_TH IS NOT NULL 
          AND TRIM(Region_TH) != ''
        ORDER BY Region_TH ASC
      `).all(customer) as { Region_TH: string }[];

      return NextResponse.json({
        success: true,
        regions: regions.map((r) => r.Region_TH),
      });
    }

    // 3. If both customer and region specified, return active stores
    const stores = db.prepare(`
      SELECT 
        STORE_ID,
        Customer,
        STORE_NAME,
        Store_Name_TH,
        Province_TH,
        Region_TH
      FROM stores 
      WHERE TRIM(Customer) = TRIM(?) COLLATE NOCASE 
        AND TRIM(Region_TH) = TRIM(?) COLLATE NOCASE 
        AND LOWER(TRIM(Active_Inactive)) = 'active' 
      ORDER BY Province_TH ASC, Store_Name_TH ASC
    `).all(customer, region);

    return NextResponse.json({
      success: true,
      stores,
    });
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลร้านค้าได้' },
      { status: 500 }
    );
  }
}
