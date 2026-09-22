import { Product } from '@/features/products/types/product.types';
import { PRODUCT_BULK_EDIT_GROUPS, REQUIRED_BULK_EDIT_GROUPS } from '../constant/productBulkEdit.constants';

/** 필수 그룹이 커버하는 키 — clearKeys로 들어와도 지우지 않는다. */
const REQUIRED_PRODUCT_KEYS: ReadonlySet<keyof Product> = new Set(
  REQUIRED_BULK_EDIT_GROUPS.flatMap((group) => [...PRODUCT_BULK_EDIT_GROUPS[group]]),
);

/**
 * 일괄수정의 상품 스냅샷 병합. 보낸 키만 얕게 덮고 clearKeys의 선택 키를 지운다.
 * product_snapshot은 jsonb 통째라 route는 이 결과를 그대로 쓴다(읽기 → 병합 → 통째 쓰기).
 */
export const mergeProductSnapshot = (
  current: Product,
  patch: Partial<Product> | undefined,
  clearKeys: (keyof Product)[] | undefined,
): Product => {
  // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 요청 본문과 공유되어 스냅샷 독립성이 깨진다.
  const merged = { ...structuredClone(current), ...structuredClone(patch ?? {}) };
  // 필수 키는 undefined가 되는 순간 목록·수정 화면이 깨지므로(price.toLocaleString() 등)
  // 클라이언트가 뭘 보내든 지우지 않는다. 클라이언트 검증의 최종 방어선이다.
  clearKeys?.forEach((key) => {
    if (REQUIRED_PRODUCT_KEYS.has(key)) return;
    delete (merged as Record<string, unknown>)[key];
  });
  return merged;
};
