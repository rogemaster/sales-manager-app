import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { UserGrade } from '@/features/auth/types/Auth';
import { can, Permission } from '@/shared/utils/permission';

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

/**
 * 정책표(permission.ts)로 권한을 판정한다. route 맨 앞, try 밖에서 호출한다 — DB 접근보다 먼저여야 한다.
 * 정책표에 없는 동작(조회, 상품·연동상품)은 이 가드가 아니라 requireSession만 쓴다.
 */
export async function requirePermission(req: NextRequest, permission: Permission): Promise<ApiSession | NextResponse> {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  if (!can(session.grade, permission)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  return session;
}
