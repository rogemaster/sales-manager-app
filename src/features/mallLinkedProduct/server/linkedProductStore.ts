import 'server-only';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProductHistories, mallLinkedProducts } from '@/db/schema';

/** 연동 행 읽기 경로의 select 목록. 생성 컬럼(product_name·product_state)은 검색 전용이라 내보내지 않는다. */
export const LINKED_PRODUCT_COLUMNS = {
  id: mallLinkedProducts.id,
  ownerId: mallLinkedProducts.ownerId,
  mallCode: mallLinkedProducts.mallCode,
  mallAccountId: mallLinkedProducts.mallAccountId,
  mallId: mallLinkedProducts.mallId,
  sourceProductId: mallLinkedProducts.sourceProductId,
  sourceShoppingSettingId: mallLinkedProducts.sourceShoppingSettingId,
  status: mallLinkedProducts.status,
  externalProductId: mallLinkedProducts.externalProductId,
  errorMessage: mallLinkedProducts.errorMessage,
  productSnapshot: mallLinkedProducts.productSnapshot,
  settingSnapshot: mallLinkedProducts.settingSnapshot,
  createdByEmail: mallLinkedProducts.createdByEmail,
  updatedByEmail: mallLinkedProducts.updatedByEmail,
  createdAt: mallLinkedProducts.createdAt,
  lastSentAt: mallLinkedProducts.lastSentAt,
  updatedAt: mallLinkedProducts.updatedAt,
};

/** 같은 테넌트 × 같은 상품 × 같은 몰에 성공 건이 있는가. 랜덤 판정의 중복 사유에 쓴다. */
export const hasPriorSuccess = async (
  ownerId: string,
  productId: string,
  mallCode: string,
  excludeId?: string,
): Promise<boolean> => {
  const conditions = [
    eq(mallLinkedProducts.ownerId, ownerId),
    eq(mallLinkedProducts.sourceProductId, productId),
    eq(mallLinkedProducts.mallCode, mallCode),
    eq(mallLinkedProducts.status, 'success'),
  ];
  if (excludeId) conditions.push(ne(mallLinkedProducts.id, excludeId));

  const [row] = await db
    .select({ id: mallLinkedProducts.id })
    .from(mallLinkedProducts)
    .where(and(...conditions))
    .limit(1);
  return !!row;
};

/**
 * 이력 1행을 남긴다. 실패해도 던지지 않는다.
 * 외부몰에는 이미 반영된 결과라, 우리 쪽 부수 기록 실패로 연동 건을 실패로 적으면 사실과 어긋난다(스펙 D6).
 */
export const recordHistory = async (entry: typeof mallLinkedProductHistories.$inferInsert): Promise<void> => {
  try {
    await db.insert(mallLinkedProductHistories).values(entry);
  } catch (error) {
    console.error(`전송 이력 기록 실패 (${entry.linkedProductId}):`, error);
  }
};
