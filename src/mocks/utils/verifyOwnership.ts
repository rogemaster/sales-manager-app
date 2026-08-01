import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;

export const allOwnedBy = <T extends { id: string; ownerId: string }>(
  ids: string[],
  requestOwnerId: string | null,
  data: T[],
): boolean =>
  ids.every((id) => {
    const item = data.find((d) => d.id === id);
    return !!item && isOwnerMatch(item.ownerId, requestOwnerId);
  });

// Product는 식별자 필드명이 `productId`라 allOwnedBy(제네릭 제약: `id`)를 그대로 쓸 수 없어 별도 헬퍼로 둔다.
export const areProductsOwnedBy = (productIds: string[], requestOwnerId: string | null): boolean =>
  productIds.every((productId) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === productId);
    return !!product && isOwnerMatch(product.ownerId, requestOwnerId);
  });

// 몰 연동 전송 요청은 상품(productId)·설정(shoppingSettingId) 두 리소스의 소유권을 함께 검증해야 한다.
// id 추출(dedup) + 검증을 이 헬퍼 하나로 모아 핸들러가 데이터를 직접 다루지 않도록 한다 (msw-rules.md).
export const areMallLinkRequestsOwnedBy = (
  items: MallLinkedProductRequestItem[],
  requestOwnerId: string | null,
): boolean => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const settingIds = [...new Set(items.map((item) => item.shoppingSettingId))];

  return (
    areProductsOwnedBy(productIds, requestOwnerId) &&
    allOwnedBy(settingIds, requestOwnerId, MOCK_SHOPPING_SETTINGS_DATA)
  );
};
