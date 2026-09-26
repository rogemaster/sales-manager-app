import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { bulkIdsRequestSchema } from '@/shared/utils/bulkRequest';

export async function DELETE(req: NextRequest) {
  const session = await requirePermission(req, 'user.delete');
  if (session instanceof NextResponse) return session;

  // ids가 빠지거나 문자열 배열이 아니면 400이다. 중복은 스키마가 걷어낸다.
  const body = await parseRequestBody(req, bulkIdsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids: uniqueIds } = body;

    // 빈 조건으로 쿼리를 보내지 않는다. 화면은 선택이 없으면 요청 전에 막는다.
    if (uniqueIds.length === 0) return NextResponse.json({ success: true });

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

    // 위에서 소유권을 확인했지만 WHERE에도 소유자 조건을 둔다 — 다른 쓰기 route와 같은 모양이고,
    // 확인과 삭제 사이에 목록이 달라져도 남의 행에는 닿지 않는다.
    await db.delete(users).where(and(inArray(users.id, uniqueIds), eq(users.ownerId, session.ownerId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 중 에러:', error);
    return serverErrorResponse();
  }
}
