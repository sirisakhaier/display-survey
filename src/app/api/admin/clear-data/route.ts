import { NextRequest, NextResponse } from 'next/server';
import { getDb, REQUESTS_UPLOADS_DIR } from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = authorizeAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { confirmation } = body;

    if (confirmation !== 'DELETE_ALL_DATA') {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกคำยืนยันการลบข้อมูล (DELETE_ALL_DATA) ให้ถูกต้อง' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 1. Delete database tables in atomic transaction
    const clearTransaction = db.transaction(() => {
      db.exec('DELETE FROM display_entry_items');
      db.exec('DELETE FROM display_entries');
      db.exec('DELETE FROM display_requests');
    });

    clearTransaction();

    // 2. Clean up picture files from uploads directories
    let deletedFilesCount = 0;
    const publicRequestsDir = path.join(process.cwd(), 'public', 'uploads', 'requests');

    const cleanDirectory = (dir: string) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.startsWith('.')) continue;
          try {
            fs.unlinkSync(path.join(dir, file));
            deletedFilesCount++;
          } catch (e) {
            console.error('Error deleting file:', file, e);
          }
        }
      }
    };

    cleanDirectory(REQUESTS_UPLOADS_DIR);
    cleanDirectory(publicRequestsDir);

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลการสำรวจและรูปภาพทั้งหมดเรียบร้อยแล้ว',
      deletedFilesCount,
    });
  } catch (error: any) {
    console.error('Error clearing survey data:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message },
      { status: 500 }
    );
  }
}
