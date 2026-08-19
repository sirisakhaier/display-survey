import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const db = getDb();

    const stores = db.prepare('SELECT * FROM stores').all();
    const models = db.prepare('SELECT * FROM models').all();
    const entries = db.prepare('SELECT * FROM display_entries').all();
    const entryItems = db.prepare('SELECT * FROM display_entry_items').all();
    const requests = db.prepare('SELECT * FROM display_requests').all();

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        stores: stores.length,
        models: models.length,
        entries: entries.length,
        entryItems: entryItems.length,
        requests: requests.length,
      },
      stores,
      models,
      entries,
      entryItems,
      requests,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `haier_display_survey_backup_${dateStr}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating backup:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างไฟล์สำรองข้อมูล: ' + error.message },
      { status: 500 }
    );
  }
}
