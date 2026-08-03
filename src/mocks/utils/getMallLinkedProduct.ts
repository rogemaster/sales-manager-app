import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { isOwnerMatch } from './verifyOwnership';

/**
 * 연동 데이터 단건 조회.
 * 없는 id와 남의 데이터를 구분하지 않고 둘 다 null을 반환한다 — 핸들러가 이를 404로 변환해
 * 남의 데이터가 존재한다는 사실 자체를 응답으로 노출하지 않는다.
 */
export const getMockMallLinkedProduct = (id: string, ownerId: string | null): MallLinkedProduct | null => {
  const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id);
  if (!linked || !isOwnerMatch(linked.ownerId, ownerId)) return null;
  return linked;
};
