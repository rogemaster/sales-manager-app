import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { UserGrade } from '@/features/auth/types/Auth';

export type ApiSession = {
  id: string;
  ownerId: string;
  grade: UserGrade;
  email: string;
};

export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  return {
    id: token.id,
    ownerId: token.ownerId,
    grade: token.grade,
    email: token.email ?? '',
  };
}

export async function requireSuperAdminSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  if (session.grade !== 'super_admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  return session;
}
