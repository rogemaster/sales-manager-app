import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { BulkAccountResult } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ACCOUNT_NOT_FOUND_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

export async function PATCH(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingAccount.changeStatus');
  if (session instanceof NextResponse) return session;

  try {
    const { ids, isActive } = (await req.json()) as { ids: string[]; isActive: boolean };

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: '사용여부 값이 올바르지 않습니다.' }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkAccountResult);
    }

    const updated = await db
      .update(shoppingAccounts)
      .set({ isActive, updatedAt: new Date() })
      .where(and(inArray(shoppingAccounts.id, uniqueIds), eq(shoppingAccounts.ownerId, session.ownerId)))
      .returning({ id: shoppingAccounts.id });

    const updatedIds = new Set(updated.map(({ id }) => id));
    const failures = uniqueIds
      .filter((id) => !updatedIds.has(id))
      .map((id) => ({ id, message: ACCOUNT_NOT_FOUND_MESSAGE }));

    return NextResponse.json({ successCount: updated.length, failures } satisfies BulkAccountResult);
  } catch (error) {
    console.error('쇼핑몰 계정 사용여부 변경 중 에러:', error);
    return serverErrorResponse();
  }
}
