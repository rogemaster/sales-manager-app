import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requirePermission } from '@/shared/utils/apiAuth';
import { toKstYmd } from '@/shared/utils/date';
import { ApproveUsersResult } from '@/features/account/types/user.types';

export async function PATCH(req: NextRequest) {
  const session = await requirePermission(req, 'user.approve');
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = (await req.json()) as { ids?: unknown };
    const uniqueIds = Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string'))] : [];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ approvedCount: 0 } satisfies ApproveUsersResult);
    }

    // 삭제 route와 같은 fail-closed 규칙 — 같은 화면의 같은 선택 목록을 쓴다.
    const owned = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, uniqueIds), eq(users.ownerId, session.ownerId)));

    if (owned.length !== uniqueIds.length) {
      return NextResponse.json({ error: '승인 권한이 없는 사용자가 포함되어 있습니다.' }, { status: 403 });
    }

    // 이미 active인 사용자는 오류가 아니라 건너뛴다 — 화면에 승인된 인원 수를 보여준다.
    const now = toKstYmd(new Date());
    const approved = await db
      .update(users)
      .set({ status: 'active', updatedAt: now })
      .where(and(inArray(users.id, uniqueIds), eq(users.ownerId, session.ownerId), eq(users.status, 'pending')))
      .returning({ id: users.id });

    return NextResponse.json({ approvedCount: approved.length } satisfies ApproveUsersResult);
  } catch (error) {
    console.error('사용자 승인 중 에러:', error);
    return serverErrorResponse();
  }
}
