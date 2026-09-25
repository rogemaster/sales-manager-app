import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { BulkSettingResult } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SETTING_NOT_FOUND_MESSAGE } from '@/features/shoppingSetting/util/shoppingSettingWriteSchema';

export async function PATCH(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingSetting.changeStatus');
  if (session instanceof NextResponse) return session;

  try {
    const { ids, isActive } = (await req.json()) as { ids: string[]; isActive: boolean };

    // 값 검사를 빈 목록 처리보다 먼저 한다 — 쇼핑몰계정 status route와 같은 요청에 같은 응답을 준다.
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: '사용여부 값이 올바르지 않습니다.' }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkSettingResult);
    }

    // 내 것만 바꾼다. 부분 성공이 정상 결과이므로 전체를 거부하지 않는다 —
    // neon-http는 트랜잭션을 지원하지 않아 "전부 아니면 전무"를 약속해도 지킬 수 없다.
    const updated = await db
      .update(shoppingSettings)
      .set({ isActive, updatedAt: new Date() })
      .where(and(inArray(shoppingSettings.id, uniqueIds), eq(shoppingSettings.ownerId, session.ownerId)))
      .returning({ id: shoppingSettings.id });

    const updatedIds = new Set(updated.map(({ id }) => id));
    const failures = uniqueIds
      .filter((id) => !updatedIds.has(id))
      .map((id) => ({ id, message: SETTING_NOT_FOUND_MESSAGE }));

    return NextResponse.json({ successCount: updated.length, failures } satisfies BulkSettingResult);
  } catch (error) {
    console.error('쇼핑몰 정보설정 사용여부 변경 중 에러:', error);
    return serverErrorResponse();
  }
}
