import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const withPictures = searchParams.get('with_pictures') === 'true';
    const search = searchParams.get('search');
    const customer = searchParams.get('customer');
    const region = searchParams.get('region');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    const query = `
      SELECT 
        dr.id,
        dr.entry_id,
        dr.store_id,
        COALESCE(dr.user_name, de.user_name, '-') as user_name,
        COALESCE(dr.user_phone, de.user_phone, '-') as user_phone,
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
    `;

    const requests = db.prepare(query).all(...params) as any[];

    // Build Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Haier Display Survey System';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Display Requests');
    ws.columns = [
      { header: 'Request ID', key: 'id', width: 12 },
      { header: 'Customer', key: 'customer', width: 18 },
      { header: 'Store ID', key: 'store_id', width: 14 },
      { header: 'Customer Store ID', key: 'customer_store_id', width: 18 },
      { header: 'Store Name (TH)', key: 'store_name_th', width: 30 },
      { header: 'Province', key: 'province', width: 16 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'Requested Model', key: 'model_name', width: 22 },
      { header: 'Qty Requested', key: 'quantity', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Location / Remarks', key: 'remark', width: 30 },
      { header: 'Requested By', key: 'user_name', width: 20 },
      { header: 'Phone', key: 'user_phone', width: 15 },
      { header: 'Request Date', key: 'created_at', width: 20 },
      { header: 'Picture URL', key: 'picture_url', width: 35 },
      ...(withPictures ? [{ header: 'Location Photo', key: 'photo', width: 26 }] : []),
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE65100' }, // Vibrant Orange
    };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 25;

    requests.forEach((reqItem, index) => {
      const rowNumber = index + 2;

      const row = ws.addRow({
        id: reqItem.id,
        customer: reqItem.Customer,
        store_id: reqItem.store_id,
        customer_store_id: reqItem.Store_ID_Customer || '-',
        store_name_th: reqItem.Store_Name_TH,
        province: reqItem.Province_TH,
        region: reqItem.Region_TH,
        model_name: reqItem.model_name,
        quantity: reqItem.quantity,
        status: reqItem.status || 'Pending',
        remark: reqItem.remark || '-',
        user_name: reqItem.user_name,
        user_phone: reqItem.user_phone,
        created_at: reqItem.created_at ? new Date(reqItem.created_at).toLocaleString('th-TH') : '',
        picture_url: reqItem.picture_url || '-',
      });

      if (withPictures && reqItem.picture_url) {
        row.height = 95;

        try {
          const relativePath = reqItem.picture_url.replace(/^\//, '');
          const localPath = path.join(process.cwd(), 'public', relativePath);

          if (fs.existsSync(localPath)) {
            const imageBuffer = fs.readFileSync(localPath);
            const imageId = workbook.addImage({
              buffer: imageBuffer as any,
              extension: 'jpeg',
            });

            ws.addImage(imageId, {
              tl: { col: 15, row: rowNumber - 1 + 0.1 },
              ext: { width: 115, height: 85 },
            });
          }
        } catch (imgErr) {
          console.error('Error embedding image in request Excel:', imgErr);
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = withPictures
      ? `Display_Model_Requests_With_Pictures_${dateStr}.xlsx`
      : `Display_Model_Requests_${dateStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer as any), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting display requests:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการ Export ข้อมูลคำขอสินค้าตัวโชว์' },
      { status: 500 }
    );
  }
}
