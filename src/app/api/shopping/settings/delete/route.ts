import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { bulkIdsRequestSchema, toBulkResult } from '@/shared/utils/bulkRequest';
import { BulkSettingResult } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SETTING_NOT_FOUND_MESSAGE } from '@/features/shoppingSetting/util/shoppingSettingWriteSchema';

export async function POST(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingSetting.delete');
  if (session instanceof NextResponse) return session;

  // ids는 스키마가 중복을 걷어낸다.
  const body = await parseRequestBody(req, bulkIdsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids } = body;

    if (ids.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkSettingResult);
    }

    // 연동 데이터는 함께 지우지 않는다 — 설정과 독립적인 데이터이고, 스냅샷을 갖고 있어
    // 설정이 사라져도 그대로 조회·수정·재전송할 수 있다(domain-design.md).
    const deleted = await db
      .delete(shoppingSettings)
      .where(and(inArray(shoppingSettings.id, ids), eq(shoppingSettings.ownerId, session.ownerId)))
      .returning({ id: shoppingSettings.id });

    return NextResponse.json(
      toBulkResult(
        ids,
        deleted.map(({ id }) => id),
        SETTING_NOT_FOUND_MESSAGE,
      ) satisfies BulkSettingResult,
    );
  } catch (error) {
    console.error('쇼핑몰 정보설정 삭제 중 에러:', error);
    return serverErrorResponse();
  }
}
