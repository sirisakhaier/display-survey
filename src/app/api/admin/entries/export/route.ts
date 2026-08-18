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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    // 1. Fetch Entries
    const entries = db.prepare(`
      SELECT 
        de.id,
        de.store_id,
        de.user_name,
        de.user_phone,
        de.submitted_at,
        de.created_at,
        s.Customer,
        s.Store_ID_Customer,
        s.STORE_NAME,
        s.Store_Name_TH,
        s.Province_TH,
        s.Region_TH,
        COUNT(DISTINCT dei.model) as total_models,
        COALESCE(SUM(dei.qty), 0) as total_qty,
        (SELECT COUNT(*) FROM display_requests dr WHERE dr.entry_id = de.id) as request_count
      FROM display_entries de
      JOIN stores s ON de.store_id = s.STORE_ID
      LEFT JOIN display_entry_items dei ON de.id = dei.entry_id
      ${whereClause}
      GROUP BY de.id
      ORDER BY de.submitted_at DESC
    `).all(...params) as any[];

    // Extract entry IDs
    const entryIds = entries.map((e) => e.id);

    // 2. Fetch Item Details
    let itemDetails: any[] = [];
    if (entryIds.length > 0) {
      const placeholders = entryIds.map(() => '?').join(',');
      itemDetails = db.prepare(`
        SELECT 
          dei.entry_id,
          de.user_name,
          de.submitted_at,
          s.Customer,
          s.STORE_ID,
          s.Store_Name_TH,
          s.Province_TH,
          m.Category,
          m.Brand,
          m.SubCategory,
          dei.model,
          dei.qty
        FROM display_entry_items dei
        JOIN display_entries de ON dei.entry_id = de.id
        JOIN stores s ON de.store_id = s.STORE_ID
        LEFT JOIN models m ON dei.model = m.Model
        WHERE dei.entry_id IN (${placeholders}) AND dei.qty > 0
        ORDER BY dei.entry_id DESC, m.Category ASC, m.Brand ASC, dei.model ASC
      `).all(...entryIds);
    }

    // 3. Fetch Display Requests (ขอสินค้าตัวโชว์)
    let displayRequests: any[] = [];
    if (entryIds.length > 0) {
      const placeholders = entryIds.map(() => '?').join(',');
      displayRequests = db.prepare(`
        SELECT 
          dr.id as request_id,
          dr.entry_id,
          dr.model_name,
          dr.quantity,
          dr.remark,
          dr.picture_url,
          dr.status,
          dr.created_at,
          de.user_name,
          de.user_phone,
          de.submitted_at,
          s.Customer,
          s.STORE_ID,
          s.Store_ID_Customer,
          s.Store_Name_TH,
          s.Province_TH,
          s.Region_TH
        FROM display_requests dr
        JOIN display_entries de ON dr.entry_id = de.id
        JOIN stores s ON dr.store_id = s.STORE_ID
        WHERE dr.entry_id IN (${placeholders})
        ORDER BY dr.id DESC
      `).all(...entryIds);
    }

    // Build Excel Workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Haier Display Survey System';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // SHEET 1: Summary Entries
    // -------------------------------------------------------------
    const wsEntries = workbook.addWorksheet('Survey Entries');
    wsEntries.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Customer', key: 'customer', width: 18 },
      { header: 'Store ID', key: 'store_id', width: 14 },
      { header: 'Customer Store ID', key: 'customer_store_id', width: 18 },
      { header: 'Store Name (TH)', key: 'store_name_th', width: 30 },
      { header: 'Province', key: 'province', width: 16 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'Recorder Name', key: 'user_name', width: 22 },
      { header: 'Phone', key: 'user_phone', width: 15 },
      { header: 'Submitted Date', key: 'submitted_at', width: 20 },
      { header: 'Total Models', key: 'total_models', width: 14 },
      { header: 'Total Display Qty', key: 'total_qty', width: 16 },
      { header: 'Display Requests Count', key: 'request_count', width: 22 },
    ];

    // Style Header Row
    wsEntries.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsEntries.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0060AF' }, // Haier Blue
    };
    wsEntries.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsEntries.getRow(1).height = 24;

    entries.forEach((e) => {
      wsEntries.addRow({
        id: e.id,
        customer: e.Customer,
        store_id: e.store_id,
        customer_store_id: e.Store_ID_Customer || '-',
        store_name_th: e.Store_Name_TH,
        province: e.Province_TH,
        region: e.Region_TH,
        user_name: e.user_name,
        user_phone: e.user_phone,
        submitted_at: e.submitted_at ? new Date(e.submitted_at).toLocaleString('th-TH') : '',
        total_models: e.total_models,
        total_qty: e.total_qty,
        request_count: e.request_count || 0,
      });
    });

    // -------------------------------------------------------------
    // SHEET 2: Model Item Details
    // -------------------------------------------------------------
    const wsItems = workbook.addWorksheet('Model Details');
    wsItems.columns = [
      { header: 'Entry ID', key: 'entry_id', width: 12 },
      { header: 'Customer', key: 'customer', width: 18 },
      { header: 'Store Name (TH)', key: 'store_name_th', width: 30 },
      { header: 'Province', key: 'province', width: 16 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 16 },
      { header: 'SubCategory', key: 'subcategory', width: 20 },
      { header: 'Model', key: 'model', width: 22 },
      { header: 'Display Qty', key: 'qty', width: 14 },
      { header: 'Recorder Name', key: 'user_name', width: 20 },
      { header: 'Submitted Date', key: 'submitted_at', width: 20 },
    ];

    wsItems.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsItems.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' }, // Teal
    };
    wsItems.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsItems.getRow(1).height = 24;

    itemDetails.forEach((item) => {
      wsItems.addRow({
        entry_id: item.entry_id,
        customer: item.Customer,
        store_name_th: item.Store_Name_TH,
        province: item.Province_TH,
        category: item.Category || 'Other',
        brand: item.Brand || 'Unknown',
        subcategory: item.SubCategory || '-',
        model: item.model,
        qty: item.qty,
        user_name: item.user_name,
        submitted_at: item.submitted_at ? new Date(item.submitted_at).toLocaleString('th-TH') : '',
      });
    });

    // -------------------------------------------------------------
    // SHEET 3: Display Model Requests (ขอสินค้าตัวโชว์)
    // -------------------------------------------------------------
    const wsRequests = workbook.addWorksheet('Display Requests');
    wsRequests.columns = [
      { header: 'Request ID', key: 'request_id', width: 12 },
      { header: 'Entry ID', key: 'entry_id', width: 10 },
      { header: 'Customer', key: 'customer', width: 18 },
      { header: 'Store ID', key: 'store_id', width: 14 },
      { header: 'Store Name (TH)', key: 'store_name_th', width: 28 },
      { header: 'Province', key: 'province', width: 16 },
      { header: 'Requested Model', key: 'model_name', width: 22 },
      { header: 'Qty Requested', key: 'quantity', width: 14 },
      { header: 'Location Details / Remark', key: 'remark', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Requested By', key: 'user_name', width: 20 },
      { header: 'Phone', key: 'user_phone', width: 15 },
      { header: 'Request Date', key: 'created_at', width: 20 },
      { header: 'Picture URL Link', key: 'picture_url', width: 35 },
      ...(withPictures ? [{ header: 'Location Photo', key: 'photo', width: 26 }] : []),
    ];

    wsRequests.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsRequests.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC2410C' }, // Warm Orange/Bronze
    };
    wsRequests.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsRequests.getRow(1).height = 24;

    displayRequests.forEach((reqItem, index) => {
      const rowNumber = index + 2; // Row 1 is header

      const row = wsRequests.addRow({
        request_id: reqItem.request_id,
        entry_id: reqItem.entry_id,
        customer: reqItem.Customer,
        store_id: reqItem.STORE_ID,
        store_name_th: reqItem.Store_Name_TH,
        province: reqItem.Province_TH,
        model_name: reqItem.model_name,
        quantity: reqItem.quantity,
        remark: reqItem.remark || '-',
        status: reqItem.status || 'Pending',
        user_name: reqItem.user_name,
        user_phone: reqItem.user_phone,
        created_at: reqItem.created_at ? new Date(reqItem.created_at).toLocaleString('th-TH') : '',
        picture_url: reqItem.picture_url || '-',
      });

      // If withPictures is requested, embed the image directly into column 15 (Location Photo)
      if (withPictures && reqItem.picture_url) {
        row.height = 90; // Set row height for photo cell

        try {
          const relativePath = reqItem.picture_url.replace(/^\//, '');
          const localPath = path.join(process.cwd(), 'public', relativePath);

          if (fs.existsSync(localPath)) {
            const imageBuffer = fs.readFileSync(localPath);
            const imageId = workbook.addImage({
              buffer: imageBuffer as any,
              extension: 'jpeg',
            });

            wsRequests.addImage(imageId, {
              tl: { col: 14, row: rowNumber - 1 + 0.1 },
              ext: { width: 110, height: 80 },
            });
          }
        } catch (imgErr) {
          console.error('Error embedding image in Excel row:', imgErr);
        }
      }
    });

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = withPictures
      ? `Display_Survey_With_Pictures_${dateStr}.xlsx`
      : `Display_Survey_Report_${dateStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer as any), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการ Export Excel' },
      { status: 500 }
    );
  }
}
