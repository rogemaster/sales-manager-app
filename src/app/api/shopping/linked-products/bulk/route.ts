import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProducts, shoppingSettings } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { mallLinkedProductBulkUpdateRequestSchema } from '@/features/mallLinkedProduct/util/mallLinkedProductRequestSchema';
import {
  BulkUpdateMallLinkedProductsBody,
  BulkUpdateMallLinkedProductsResult,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_SETTING_COLUMNS } from '@/features/shoppingSetting/util/settingColumns';
import { LINKED_PRODUCT_COLUMNS } from '@/features/mallLinkedProduct/server/linkedProductStore';
import { buildBulkUpdate, isBulkSettingMismatch } from '@/features/mallLinkedProduct/util/linkedProductWrite';

export async function PATCH(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // "수정할 내용이 없음"(바꿀 값·설정·비울 키가 모두 없음)도 스키마가 거절한다.
  const parsed = await parseRequestBody(req, mallLinkedProductBulkUpdateRequestSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    // 스키마는 모양만 본다. 스냅샷 값은 외부몰이 판정하고, 필수 키 삭제는 mergeProductSnapshot이 막는다.
    const { ids, productSnapshot, shoppingSettingId, clearKeys } = parsed as BulkUpdateMallLinkedProductsBody;

    const uniqueIds = [...new Set(ids)];
    const rows = uniqueIds.length
      ? await db
          .select(LINKED_PRODUCT_COLUMNS)
          .from(mallLinkedProducts)
          .where(and(inArray(mallLinkedProducts.id, uniqueIds), eq(mallLinkedProducts.ownerId, session.ownerId)))
      : [];

    let setting: ShoppingSetting | undefined;
    if (shoppingSettingId) {
      const [found] = await db
        .select(SHOPPING_SETTING_COLUMNS)
        .from(shoppingSettings)
        .where(and(eq(shoppingSettings.id, shoppingSettingId), eq(shoppingSettings.ownerId, session.ownerId)))
        .limit(1);
      setting = found as unknown as ShoppingSetting | undefined;
    }

    const result: BulkUpdateMallLinkedProductsResult = { totalCount: uniqueIds.length, successCount: 0, failCount: 0 };
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const now = new Date();

    // neon-http에 트랜잭션이 없어 건별로 쓴다. 한 건의 실패가 나머지를 막지 않는다.
    for (const id of uniqueIds) {
      const row = rowById.get(id);
      // 설정을 바꾸려면 몰·계정이 같아야 한다 — 계정이 바뀌면 같은 상품의 수정이 아니라 다른 상품이다.
      if (!row || (shoppingSettingId && isBulkSettingMismatch(row, setting))) {
        result.failCount += 1;
        continue;
      }

      try {
        await db
          .update(mallLinkedProducts)
          .set(buildBulkUpdate(row, { productSnapshot, clearKeys, setting }, session.email, now))
          .where(and(eq(mallLinkedProducts.id, id), eq(mallLinkedProducts.ownerId, session.ownerId)));
        result.successCount += 1;
      } catch (error) {
        console.error(`연동 상품 일괄수정 실패 (${id}):`, error);
        result.failCount += 1;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('쇼핑몰 연동 상품 일괄수정 중 에러:', error);
    return serverErrorResponse();
  }
}
