import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { bulkIdsRequestSchema, toBulkResult } from '@/shared/utils/bulkRequest';
import { BulkAccountResult } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ACCOUNT_NOT_FOUND_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

export async function POST(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingAccount.delete');
  if (session instanceof NextResponse) return session;

  // ids는 스키마가 중복을 걷어낸다.
  const body = await parseRequestBody(req, bulkIdsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids } = body;

    if (ids.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkAccountResult);
    }

    // 자기 것만 지운다. 부분 성공이 정상 결과이므로 전체를 거부하지 않는다.
    const deleted = await db
      .delete(shoppingAccounts)
      .where(and(inArray(shoppingAccounts.id, ids), eq(shoppingAccounts.ownerId, session.ownerId)))
      .returning({ id: shoppingAccounts.id });

    return NextResponse.json(
      toBulkResult(
        ids,
        deleted.map(({ id }) => id),
        ACCOUNT_NOT_FOUND_MESSAGE,
      ) satisfies BulkAccountResult,
    );
  } catch (error) {
    console.error('쇼핑몰 계정 삭제 중 에러:', error);
    return serverErrorResponse();
  }
}
