import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { AdminUser, Role } from './types';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'haier_display_survey_secret_key_2026_production';
const COOKIE_NAME = 'auth_token';

export interface TokenPayload {
  userId: number;
  username: string;
  role: Role;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): TokenPayload | null {
  // Check cookie first
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value) {
    const payload = verifyToken(cookie.value);
    if (payload) return payload;
  }

  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  return null;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function authenticateUser(req: NextRequest): { user: TokenPayload | null; errorResponse: NextResponse | null } {
  const user = getAuthUser(req);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

export function authorizeAdmin(req: NextRequest): { user: TokenPayload | null; errorResponse: NextResponse | null } {
  const { user, errorResponse } = authenticateUser(req);
  if (errorResponse) return { user: null, errorResponse };

  if (user?.role !== 'admin') {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ดำเนินการนี้' },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
