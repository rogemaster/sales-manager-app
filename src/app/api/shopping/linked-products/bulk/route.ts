import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProducts, shoppingSettings } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
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

  try {
    const { ids, productSnapshot, shoppingSettingId, clearKeys } =
      (await req.json()) as BulkUpdateMallLinkedProductsBody;

    // 값을 비우는 요청도 "무언가를 요청했다"에 해당한다 — clearKeys만 온 요청은 정상이다.
    const hasClearKeys = (clearKeys?.length ?? 0) > 0;
    if (!Array.isArray(ids) || (!productSnapshot && !shoppingSettingId && !hasClearKeys)) {
      return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
    }

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
