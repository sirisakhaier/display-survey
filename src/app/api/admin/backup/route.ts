import { NextRequest, NextResponse } from 'next/server';
import { getDb, REQUESTS_UPLOADS_DIR, UPLOADS_DIR } from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

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
    const requestsRaw = db.prepare('SELECT * FROM display_requests').all() as any[];

    // Embed picture files as base64 in each request item
    const requests = requestsRaw.map((r) => {
      let picture_base64: string | null = null;
      if (r.picture_url) {
        const filename = path.basename(r.picture_url);
        const possiblePaths = [
          path.join(REQUESTS_UPLOADS_DIR, filename),
          path.join(process.cwd(), 'public', 'uploads', 'requests', filename),
          path.join(UPLOADS_DIR, 'requests', filename),
          path.join(UPLOADS_DIR, filename),
        ];

        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            try {
              const fileBuffer = fs.readFileSync(p);
              const ext = path.extname(filename).toLowerCase().replace('.', '') || 'jpeg';
              const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
              picture_base64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
              break;
            } catch (err) {
              console.error('Error reading picture for backup:', p, err);
            }
          }
        }
      }

      return {
        ...r,
        picture_base64,
      };
    });

    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      counts: {
        stores: stores.length,
        models: models.length,
        entries: entries.length,
        entryItems: entryItems.length,
        requests: requests.length,
        requestsWithPictures: requests.filter((r) => !!r.picture_base64).length,
      },
      stores,
      models,
      entries,
      entryItems,
      requests,
    };

    const jsonString = JSON.stringify(backupData);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `haier_survey_complete_backup_${dateStr}.json`;

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
