import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { UserGrade } from '@/features/auth/types/Auth';
import { can, Permission } from '@/shared/utils/permission';
import { loadSessionUser, SessionUserRow } from '@/shared/utils/sessionUser';

export type ApiSession = {
  id: string;
  ownerId: string;
  grade: UserGrade;
  email: string;
};

const USER_GRADES: readonly string[] = ['super_admin', 'admin', 'operator'] satisfies UserGrade[];

/**
 * DB 행으로 세션을 만든다. 삭제·비활성·알 수 없는 등급이면 null.
 * 등급과 워크스페이스는 토큰이 아니라 DB 값이다 — 토큰은 발급 시점 사본이라 최대 30일 낡는다.
 */
export function resolveApiSession(user: SessionUserRow | null): ApiSession | null {
  if (!user || user.status !== 'active' || !USER_GRADES.includes(user.grade)) return null;
  return {
    id: user.id,
    // owner_id 컬럼이 nullable이라(2026-07-08 이전 가입 계정의 하위호환) id로 대신한다.
    ownerId: user.ownerId ?? user.id,
    grade: user.grade as UserGrade,
    email: user.email,
  };
}

export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let user: SessionUserRow | null;
  try {
    user = await loadSessionUser(token.id);
  } catch (error) {
    // 401로 답하면 브라우저가 로그아웃시킨다. 일시적 DB 장애로 전원이 쫓겨나지 않게 500으로 구분한다.
    console.error('세션 사용자 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }

  const session = resolveApiSession(user);
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  return session;
}

/**
 * 정책표(permission.ts)로 권한을 판정한다. route 맨 앞, try 밖에서 호출한다 — 업무 데이터 접근보다 먼저여야 한다.
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
