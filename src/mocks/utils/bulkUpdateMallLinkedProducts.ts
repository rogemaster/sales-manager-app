import {
  BulkUpdateMallLinkedProductsBody,
  BulkUpdateMallLinkedProductsResult,
  MallLinkedProduct,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { Product } from '@/features/products/types/product.types';
import {
  PRODUCT_BULK_EDIT_GROUPS,
  REQUIRED_BULK_EDIT_GROUPS,
} from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { isOwnerMatch } from './verifyOwnership';

/**
 * 고른 설정을 이 연동 건에 적용해도 되는지 판정한다.
 *
 * mallCode·mallAccountId·mallId는 연동 데이터의 불변 식별 정보다 (domain-design.md).
 * 연동 1건 = 특정 계정으로 등록된 외부몰 상품 1개이므로, 계정이 바뀌면 같은 상품의 수정이 아니라
 * 다른 상품이 된다. UI에서 같은 몰·계정으로 이미 좁히지만 최종 방어선을 여기 둔다.
 */
const isApplicableSetting = (linked: MallLinkedProduct, setting: ShoppingSetting): boolean =>
  setting.mallCode === linked.mallCode &&
  setting.mallAccountId === linked.settingSnapshot.mallAccountId &&
  setting.mallId === linked.settingSnapshot.mallId;

/** 필수 그룹이 커버하는 키 — 이 키들은 clearKeys로 들어와도 지우지 않는다. */
const REQUIRED_PRODUCT_KEYS: ReadonlySet<keyof Product> = new Set(
  REQUIRED_BULK_EDIT_GROUPS.flatMap((group) => [...PRODUCT_BULK_EDIT_GROUPS[group]]),
);

/**
 * 선택한 연동 건들의 스냅샷을 한 번에 갱신한다.
 *
 * 상품은 클라이언트가 보낸 patch를 얕은 병합하고, 설정은 shoppingSettingId로 오리지널을 읽어
 * 통째 교체한다 — 설정 쪽을 서버가 읽어 복사하는 것은 생성 흐름과 같은 책임 분담이다.
 *
 * status·lastSentAt·externalProductId는 전송 액션의 소관이라 여기서 건드리지 않는다.
 */
export const bulkUpdateMockMallLinkedProducts = (
  body: BulkUpdateMallLinkedProductsBody,
): BulkUpdateMallLinkedProductsResult | null => {
  const { ownerId, ids, updatedByEmail, productSnapshot, shoppingSettingId, clearKeys } = body;

  // 값을 비우는 요청도 "무언가를 요청했다"에 해당한다 — clearKeys만 온 요청은 정상이다.
  const hasClearKeys = (clearKeys?.length ?? 0) > 0;
  if (!productSnapshot && !shoppingSettingId && !hasClearKeys) return null;

  const now = new Date().toISOString();
  const result: BulkUpdateMallLinkedProductsResult = { totalCount: ids.length, successCount: 0, failCount: 0 };

  ids.forEach((id) => {
    const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id);
    if (!linked || !isOwnerMatch(linked.ownerId, ownerId)) {
      result.failCount += 1;
      return;
    }

    let nextSetting: ShoppingSetting | undefined;
    if (shoppingSettingId) {
      const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === shoppingSettingId);
      if (!setting || !isOwnerMatch(setting.ownerId, ownerId) || !isApplicableSetting(linked, setting)) {
        result.failCount += 1;
        return;
      }
      nextSetting = setting;
    }

    // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 요청 본문·오리지널 설정과 공유되어 스냅샷 독립성이 깨진다.
    if (productSnapshot || hasClearKeys) {
      const merged = { ...linked.productSnapshot, ...structuredClone(productSnapshot ?? {}) };
      // 필수 키는 undefined가 되는 순간 목록·수정 화면이 깨지므로(price.toLocaleString() 등)
      // 클라이언트가 뭘 보내든 지우지 않는다. 클라이언트 검증의 최종 방어선이다.
      clearKeys?.forEach((key) => {
        if (REQUIRED_PRODUCT_KEYS.has(key)) return;
        // Product의 필수 키는 delete가 타입 에러라 단언이 필요하다. 위에서 이미 걸러냈다.
        delete (merged as Record<string, unknown>)[key];
      });
      linked.productSnapshot = merged;
    }
    if (nextSetting) {
      linked.settingSnapshot = structuredClone(nextSetting);
      linked.sourceShoppingSettingId = nextSetting.id;
    }

    linked.updatedByEmail = updatedByEmail;
    linked.updatedAt = now;
    result.successCount += 1;
  });

  return result;
};
