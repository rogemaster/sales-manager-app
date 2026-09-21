import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

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
// 상품 목록은 호출자가 넘긴다 — 상품이 Neon에 있어 MSW가 직접 읽을 수 없다.
export const areProductsOwnedBy = (productIds: string[], requestOwnerId: string | null, products: Product[]): boolean =>
  productIds.every((productId) => {
    const product = products.find((p) => p.productId === productId);
    return !!product && isOwnerMatch(product.ownerId, requestOwnerId);
  });

// 몰 연동 전송 요청은 상품(productId)·설정(shoppingSettingId) 두 리소스의 소유권을 함께 검증해야 한다.
// 상품·설정 모두 호출자가 넘긴다 — 둘 다 Neon에 있어 MSW가 직접 읽을 수 없다.
export const areMallLinkRequestsOwnedBy = (
  items: MallLinkedProductRequestItem[],
  requestOwnerId: string | null,
  products: Product[],
  settings: ShoppingSetting[],
): boolean => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const settingIds = [...new Set(items.map((item) => item.shoppingSettingId))];

  return (
    areProductsOwnedBy(productIds, requestOwnerId, products) && allOwnedBy(settingIds, requestOwnerId, settings)
  );
};

// 연동 데이터는 식별자가 `id`라 제네릭 allOwnedBy를 그대로 쓸 수 있다.
// 핸들러가 mock 데이터를 직접 import하지 않도록 얇은 래퍼로 감싼다 (msw-rules.md).
export const areLinkedProductsOwnedBy = (ids: string[], requestOwnerId: string | null): boolean =>
  allOwnedBy(ids, requestOwnerId, MOCK_MALL_LINKED_PRODUCT_DATA);
