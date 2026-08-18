import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // 'categories' | 'subcategories' | 'brands' | 'models' | 'all'

    const db = getDb();

    // 1. If asking for all active models dictionary
    if (type === 'all') {
      const allModels = db.prepare(`
        SELECT Model, Brand, Category, SubCategory, Active_Inactive
        FROM models 
        WHERE LOWER(TRIM(Active_Inactive)) = 'active'
        ORDER BY Category ASC, Brand ASC, Model ASC
      `).all();

      return NextResponse.json({
        success: true,
        models: allModels,
      });
    }

    // 2. If asking for categories metadata
    if (type === 'categories' || (!category && !brand && !subcategory && !search && !type)) {
      const categories = db.prepare(`
        SELECT DISTINCT Category 
        FROM models 
        WHERE LOWER(TRIM(Active_Inactive)) = 'active'
          AND Category IS NOT NULL 
          AND TRIM(Category) != ''
        ORDER BY Category ASC
      `).all() as { Category: string }[];

      return NextResponse.json({
        success: true,
        categories: categories.map((c) => c.Category),
      });
    }

    // 3. If asking for subcategories within a category
    if (type === 'subcategories' && category) {
      const subcategories = db.prepare(`
        SELECT DISTINCT SubCategory 
        FROM models 
        WHERE TRIM(Category) = TRIM(?) COLLATE NOCASE 
          AND LOWER(TRIM(Active_Inactive)) = 'active' 
          AND SubCategory IS NOT NULL 
          AND TRIM(SubCategory) != ''
        ORDER BY SubCategory ASC
      `).all(category) as { SubCategory: string }[];

      return NextResponse.json({
        success: true,
        subcategories: subcategories.map((s) => s.SubCategory),
      });
    }

    // 4. If asking for brands within a category
    if (type === 'brands' && category) {
      let query = `
        SELECT DISTINCT Brand 
        FROM models 
        WHERE TRIM(Category) = TRIM(?) COLLATE NOCASE 
          AND LOWER(TRIM(Active_Inactive)) = 'active'
          AND Brand IS NOT NULL
          AND TRIM(Brand) != ''
      `;
      const params: any[] = [category];

      if (subcategory && subcategory !== 'all') {
        query += ` AND TRIM(SubCategory) = TRIM(?) COLLATE NOCASE`;
        params.push(subcategory);
      }

      query += ` ORDER BY Brand ASC`;
      const brands = db.prepare(query).all(...params) as { Brand: string }[];

      return NextResponse.json({
        success: true,
        brands: brands.map((b) => b.Brand),
      });
    }

    // 5. Query models with full hierarchy filtering
    let query = `
      SELECT Model, Brand, Category, SubCategory, Active_Inactive
      FROM models 
      WHERE LOWER(TRIM(Active_Inactive)) = 'active'
    `;
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ` AND TRIM(Category) = TRIM(?) COLLATE NOCASE`;
      params.push(category);
    }

    if (subcategory && subcategory !== 'all') {
      query += ` AND TRIM(SubCategory) = TRIM(?) COLLATE NOCASE`;
      params.push(subcategory);
    }

    if (brand && brand !== 'all') {
      query += ` AND TRIM(Brand) = TRIM(?) COLLATE NOCASE`;
      params.push(brand);
    }

    if (search && search.trim()) {
      query += ` AND (Model LIKE ? OR Brand LIKE ? OR SubCategory LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY Category ASC, Brand ASC, SubCategory ASC, Model ASC`;

    const models = db.prepare(query).all(...params);

    // Also get available brands & subcategories for this category to make UI reactive
    let availableBrands: string[] = [];
    let availableSubCategories: string[] = [];

    if (category && category !== 'all') {
      const bRows = db.prepare(`
        SELECT DISTINCT Brand 
        FROM models 
        WHERE TRIM(Category) = TRIM(?) COLLATE NOCASE 
          AND LOWER(TRIM(Active_Inactive)) = 'active' 
          AND Brand IS NOT NULL
          AND TRIM(Brand) != ''
        ORDER BY Brand ASC
      `).all(category) as { Brand: string }[];
      availableBrands = bRows.map((b) => b.Brand);

      const sRows = db.prepare(`
        SELECT DISTINCT SubCategory 
        FROM models 
        WHERE TRIM(Category) = TRIM(?) COLLATE NOCASE 
          AND LOWER(TRIM(Active_Inactive)) = 'active' 
          AND SubCategory IS NOT NULL 
          AND TRIM(SubCategory) != ''
        ORDER BY SubCategory ASC
      `).all(category) as { SubCategory: string }[];
      availableSubCategories = sRows.map((s) => s.SubCategory);
    }

    return NextResponse.json({
      success: true,
      models,
      brands: availableBrands,
      subcategories: availableSubCategories,
    });
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลรายการสินค้าได้' },
      { status: 500 }
    );
  }
}
