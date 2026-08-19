import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string[] } }
) {
  try {
    const filePathParts = params.file || [];
    if (filePathParts.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Prevent directory traversal
    const safeRelPath = path.join(...filePathParts.map((p) => path.basename(p)));
    
    // Check in UPLOADS_DIR first
    let fullPath = path.join(UPLOADS_DIR, safeRelPath);
    if (!fs.existsSync(fullPath)) {
      // Fallback to public/uploads
      fullPath = path.join(process.cwd(), 'public', 'uploads', safeRelPath);
    }

    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving upload image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
