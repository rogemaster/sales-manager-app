import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';

export async function DELETE(req: NextRequest) {
  const session = await requirePermission(req, 'user.delete');
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = await req.json();
    const uniqueIds = [...new Set(ids)] as string[];

    // 슈퍼계정은 ownerId === id(자기참조)라 자기 자신도 아래 소유권 검사를 통과한다.
    // 지우면 그 테넌트의 상품·연동 데이터가 주인 없는 상태로 남고 로그인 수단도 사라진다.
    if (uniqueIds.includes(session.id)) {
      return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 });
    }

    const owned = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, uniqueIds), eq(users.ownerId, session.ownerId)));

    if (owned.length !== uniqueIds.length) {
      return NextResponse.json({ error: '삭제 권한이 없는 사용자가 포함되어 있습니다.' }, { status: 403 });
    }

    await db.delete(users).where(inArray(users.id, ids));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 중 에러:', error);
    return serverErrorResponse();
  }
}
