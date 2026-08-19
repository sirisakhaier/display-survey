import { NextRequest, NextResponse } from 'next/server';
import { getDb, DB_PATH, DATA_DIR, UPLOADS_DIR } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return errorResponse;

  try {
    const db = getDb();
    const storeCount = (db.prepare('SELECT COUNT(*) as count FROM stores').get() as { count: number })?.count || 0;
    const modelCount = (db.prepare('SELECT COUNT(*) as count FROM models').get() as { count: number })?.count || 0;
    const entryCount = (db.prepare('SELECT COUNT(*) as count FROM display_entries WHERE submitted_at IS NOT NULL').get() as { count: number })?.count || 0;
    const requestCount = (db.prepare('SELECT COUNT(*) as count FROM display_requests').get() as { count: number })?.count || 0;

    const dbExists = fs.existsSync(DB_PATH);
    const dbSize = dbExists ? fs.statSync(DB_PATH).size : 0;

    return NextResponse.json({
      success: true,
      dataDir: DATA_DIR,
      dbPath: DB_PATH,
      uploadsDir: UPLOADS_DIR,
      dbSizeFormatted: `${(dbSize / 1024).toFixed(1)} KB`,
      isPersistentVolume: DATA_DIR.startsWith('/data') || DATA_DIR.startsWith('/app/data'),
      counts: {
        stores: storeCount,
        models: modelCount,
        entries: entryCount,
        requests: requestCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching system status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
