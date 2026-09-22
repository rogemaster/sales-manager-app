import { Product } from '@/features/products/types/product.types';

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
