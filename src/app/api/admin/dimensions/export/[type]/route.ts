import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';
import Papa from 'papaparse';

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  // Available to both Admin and Viewer
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const type = params.type;
    const db = getDb();

    if (type === 'store') {
      const stores = db.prepare(`
        SELECT 
          Customer,
          Store_ID_Customer as 'Store ID Customer',
          STORE_ID,
          STORE_NAME,
          Store_Name_TH as 'Store Name TH',
          Province_TH as 'Province TH',
          Region_TH as 'Region TH',
          Active_Inactive as 'Active-Inactive'
        FROM stores
        ORDER BY Customer ASC, Province_TH ASC, Store_Name_TH ASC
      `).all();

      const csv = Papa.unparse(stores);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Dimension_Store_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (type === 'model') {
      const models = db.prepare(`
        SELECT 
          Model,
          Brand,
          Category,
          SubCategory,
          Active_Inactive as 'Active-Inactive',
          Remark,
          Update_by as 'Update by',
          Update_date as 'Update date'
        FROM models
        ORDER BY Category ASC, Brand ASC, Model ASC
      `).all();

      const csv = Papa.unparse(models);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Dimension_Model_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error exporting dimension CSV:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' },
      { status: 500 }
    );
  }
}
