import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { bulkStatusRequestSchema, toBulkResult } from '@/shared/utils/bulkRequest';
import { BulkSettingResult } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SETTING_NOT_FOUND_MESSAGE } from '@/features/shoppingSetting/util/shoppingSettingWriteSchema';

export async function PATCH(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingSetting.changeStatus');
  if (session instanceof NextResponse) return session;

  // isActive는 빈 목록이어도 검사된다 — 쇼핑몰계정 status route와 같은 요청에 같은 응답을 준다.
  const body = await parseRequestBody(req, bulkStatusRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids, isActive } = body;

    if (ids.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkSettingResult);
    }

    // 내 것만 바꾼다. 부분 성공이 정상 결과이므로 전체를 거부하지 않는다.
    const updated = await db
      .update(shoppingSettings)
      .set({ isActive, updatedAt: new Date() })
      .where(and(inArray(shoppingSettings.id, ids), eq(shoppingSettings.ownerId, session.ownerId)))
      .returning({ id: shoppingSettings.id });

    return NextResponse.json(
      toBulkResult(
        ids,
        updated.map(({ id }) => id),
        SETTING_NOT_FOUND_MESSAGE,
      ) satisfies BulkSettingResult,
    );
  } catch (error) {
    console.error('쇼핑몰 정보설정 사용여부 변경 중 에러:', error);
    return serverErrorResponse();
  }
}
