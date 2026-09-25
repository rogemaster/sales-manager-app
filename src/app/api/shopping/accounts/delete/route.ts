import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { BulkAccountResult } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ACCOUNT_NOT_FOUND_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

export async function POST(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingAccount.delete');
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = (await req.json()) as { ids: string[] };
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkAccountResult);
    }

    // 자기 것만 지운다. 부분 성공이 정상 결과이므로 전체를 거부하지 않는다 —
    // neon-http는 트랜잭션을 지원하지 않아 "전부 아니면 전무"를 약속해도 지킬 수 없다.
    const deleted = await db
      .delete(shoppingAccounts)
      .where(and(inArray(shoppingAccounts.id, uniqueIds), eq(shoppingAccounts.ownerId, session.ownerId)))
      .returning({ id: shoppingAccounts.id });

    const deletedIds = new Set(deleted.map(({ id }) => id));
    const failures = uniqueIds
      .filter((id) => !deletedIds.has(id))
      .map((id) => ({ id, message: ACCOUNT_NOT_FOUND_MESSAGE }));

    return NextResponse.json({ successCount: deleted.length, failures } satisfies BulkAccountResult);
  } catch (error) {
    console.error('쇼핑몰 계정 삭제 중 에러:', error);
    return serverErrorResponse();
  }
}
