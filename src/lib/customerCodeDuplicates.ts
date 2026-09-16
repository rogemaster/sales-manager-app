import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { products } from '@/db/schema';
import {
  ExistingCustomerCode,
  formatCustomerCodeDuplicateMessage,
  matchExistingCustomerCodes,
  toCustomerCodeKey,
} from '@/features/products/util/customerCode';

// 유니크 인덱스(products_owner_customer_code_unique)와 같은 식으로 비교해 앱 판정과 DB 판정을 맞춘다.
// 부분 인덱스라 이 조회에 `btrim(customer_code) <> ''` 조건이 없으면 인덱스를 타지 않는다 — 워크스페이스당 상품 수가 적어 두지 않았다.
const customerCodeKey = sql<string>`lower(btrim(${products.customerCode}))`;

/**
 * 워크스페이스 안에서 codes와 키가 같은 기존 코드를 찾는다. 확인 API와 쓰기 route 세 곳이 모두 이 함수를 쓴다.
 * codes는 정규화된 값이어야 한다. ownerId로 거르므로 다른 테넌트의 코드 사용 여부는 드러나지 않는다.
 */
export const findExistingCustomerCodes = async (
  ownerId: string,
  codes: readonly string[],
  excludeProductId?: string,
): Promise<ExistingCustomerCode[]> => {
  const keys = [...new Set(codes.map(toCustomerCodeKey))];
  if (keys.length === 0) return [];

  const rows = await db
    .select({ key: customerCodeKey, existingCode: products.customerCode })
    .from(products)
    .where(
      and(
        eq(products.ownerId, ownerId),
        inArray(customerCodeKey, keys),
        excludeProductId ? ne(products.productId, excludeProductId) : undefined,
      ),
    );

  return rows.flatMap(({ key, existingCode }) => (existingCode === null ? [] : [{ key, existingCode }]));
};

/** 단건 쓰기(create·PATCH)용. 겹치면 사용자에게 보여줄 문구, 아니면 null. */
export const findCustomerCodeConflictMessage = async (
  ownerId: string,
  code: string,
  excludeProductId?: string,
): Promise<string | null> => {
  const [duplicate] = matchExistingCustomerCodes(
    [code],
    await findExistingCustomerCodes(ownerId, [code], excludeProductId),
  );
  return duplicate ? formatCustomerCodeDuplicateMessage(duplicate.code, duplicate.existingCode) : null;
};
