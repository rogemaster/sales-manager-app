import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { bulkStatusRequestSchema, toBulkResult } from '@/shared/utils/bulkRequest';
import { BulkAccountResult } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ACCOUNT_NOT_FOUND_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

export async function PATCH(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingAccount.changeStatus');
  if (session instanceof NextResponse) return session;

  // isActive는 빈 목록이어도 검사된다 — 정보설정 status route와 같은 요청에 같은 응답을 준다.
  const body = await parseRequestBody(req, bulkStatusRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids, isActive } = body;

    if (ids.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkAccountResult);
    }

    const updated = await db
      .update(shoppingAccounts)
      .set({ isActive, updatedAt: new Date() })
      .where(and(inArray(shoppingAccounts.id, ids), eq(shoppingAccounts.ownerId, session.ownerId)))
      .returning({ id: shoppingAccounts.id });

    return NextResponse.json(
      toBulkResult(
        ids,
        updated.map(({ id }) => id),
        ACCOUNT_NOT_FOUND_MESSAGE,
      ) satisfies BulkAccountResult,
    );
  } catch (error) {
    console.error('쇼핑몰 계정 사용여부 변경 중 에러:', error);
    return serverErrorResponse();
  }
}
