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
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const status = searchParams.get('status');
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const db = getDb();
    const isSummary = searchParams.get('summary') === 'true';

    if (isSummary) {
      const categoryStats = db.prepare(`
        SELECT 
          Category as category,
          COUNT(*) as total,
          SUM(CASE WHEN Active_Inactive = 'Active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN Active_Inactive != 'Active' THEN 1 ELSE 0 END) as inactive
        FROM models
        WHERE Category IS NOT NULL AND Category != ''
        GROUP BY Category
        ORDER BY Category ASC
      `).all();

      return NextResponse.json({
        success: true,
        categoryStats,
      });
    }

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (
        Model LIKE ? OR 
        Brand LIKE ? OR 
        Category LIKE ? OR 
        SubCategory LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (brand && brand !== 'all') {
      whereClause += " AND Brand = ?";
      params.push(brand);
    }

    if (category && category !== 'all') {
      whereClause += " AND Category = ?";
      params.push(category);
    }

    if (subcategory && subcategory !== 'all') {
      whereClause += " AND SubCategory = ?";
      params.push(subcategory);
    }

    if (status && status !== 'all') {
      whereClause += " AND Active_Inactive = ?";
      params.push(status);
    }

    // Count
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM models ${whereClause}`).get(...params) as { count: number };
    const total = countRow.count || 0;

    let query = `
      SELECT Model, Brand, Category, SubCategory, Active_Inactive, Remark, Update_by, Update_date
      FROM models
      ${whereClause}
      ORDER BY Category ASC, Brand ASC, Model ASC
    `;

    if (!isExport) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const models = db.prepare(query).all(...params);

    // Get filter options
    const distinctBrands = db.prepare('SELECT DISTINCT Brand FROM models ORDER BY Brand ASC').all() as { Brand: string }[];
    const distinctCategories = db.prepare('SELECT DISTINCT Category FROM models ORDER BY Category ASC').all() as { Category: string }[];

    // SubCategories filtered by selected category (so dropdown only shows relevant options)
    const subCatQuery = category && category !== 'all'
      ? `SELECT DISTINCT SubCategory FROM models WHERE Category = ? AND SubCategory IS NOT NULL AND SubCategory != '' ORDER BY SubCategory ASC`
      : `SELECT DISTINCT SubCategory FROM models WHERE SubCategory IS NOT NULL AND SubCategory != '' ORDER BY SubCategory ASC`;
    const distinctSubCategories = (category && category !== 'all'
      ? db.prepare(subCatQuery).all(category)
      : db.prepare(subCatQuery).all()
    ) as { SubCategory: string }[];

    return NextResponse.json({
      success: true,
      models,
      filters: {
        brands: distinctBrands.map((b) => b.Brand),
        categories: distinctCategories.map((c) => c.Category),
        subcategories: distinctSubCategories.map((s) => s.SubCategory),
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching dimension models:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลรายการสินค้าได้' },
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
    const { model, models, brand, category, status } = body;

    if (!status || !['Active', 'Not active'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'สถานะไม่ถูกต้อง (ต้องเป็น Active หรือ Not active)' },
        { status: 400 }
      );
    }

    const db = getDb();
    let updatedCount = 0;
    let logDetail = '';
    const now = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    const updatedBy = user?.username || 'admin';

    // 1. Single Model update
    if (model) {
      const res = db.prepare(`
        UPDATE models 
        SET Active_Inactive = ?, Update_by = ?, Update_date = ? 
        WHERE Model = ?
      `).run(status, updatedBy, now, model);
      updatedCount = res.changes;
      logDetail = `Update Model [${model}] status to ${status}`;
    }
    // 2. Multiple Models update
    else if (models && Array.isArray(models) && models.length > 0) {
      const updateMany = db.transaction((modelList: string[]) => {
        let count = 0;
        const stmt = db.prepare(`
          UPDATE models 
          SET Active_Inactive = ?, Update_by = ?, Update_date = ? 
          WHERE Model = ?
        `);
        for (const m of modelList) {
          const res = stmt.run(status, updatedBy, now, m);
          count += res.changes;
        }
        return count;
      });
      updatedCount = updateMany(models);
      logDetail = `Bulk update ${updatedCount} models to ${status}`;
    }
    // 3. By Brand
    else if (brand) {
      const res = db.prepare(`
        UPDATE models 
        SET Active_Inactive = ?, Update_by = ?, Update_date = ? 
        WHERE Brand = ?
      `).run(status, updatedBy, now, brand);
      updatedCount = res.changes;
      logDetail = `Bulk update all models for Brand [${brand}] to ${status} (${updatedCount} models)`;
    }
    // 4. By Category
    else if (category) {
      const res = db.prepare(`
        UPDATE models 
        SET Active_Inactive = ?, Update_by = ?, Update_date = ? 
        WHERE Category = ?
      `).run(status, updatedBy, now, category);
      updatedCount = res.changes;
      logDetail = `Bulk update all models in Category [${category}] to ${status} (${updatedCount} models)`;
    }
    // 5. All Models
    else if (body.all) {
      const res = db.prepare(`
        UPDATE models 
        SET Active_Inactive = ?, Update_by = ?, Update_date = ?
      `).run(status, updatedBy, now);
      updatedCount = res.changes;
      logDetail = `Bulk update ALL models to ${status} (${updatedCount} models)`;
    } else {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรุ่น แบรนด์ หรือหมวดหมู่ที่ต้องการแก้ไข' },
        { status: 400 }
      );
    }

    // Record audit log
    db.prepare(`
      INSERT INTO dimension_logs (user_name, action, dimension_type, details)
      VALUES (?, 'UPDATE_STATUS', 'model', ?)
    `).run(updatedBy, logDetail);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `อัปเดตสถานะสำเร็จ (${updatedCount} รุ่น)`,
    });
  } catch (error: any) {
    console.error('Error updating model dimension:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะสินค้า' },
      { status: 500 }
    );
  }
}
