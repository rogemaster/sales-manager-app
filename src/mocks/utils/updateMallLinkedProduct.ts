import {
  MallLinkedProduct,
  UpdateMallLinkedProductBody,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { isOwnerMatch } from './verifyOwnership';

/**
 * 연동 데이터의 스냅샷만 교체한다.
 * status·lastSentAt·externalProductId는 전송 액션의 소관이라 여기서 건드리지 않는다 —
 * 저장과 재전송을 분리한 의미가 이 경계에 있다.
 */
export const updateMockMallLinkedProduct = (
  id: string,
  ownerId: string | null,
  body: UpdateMallLinkedProductBody,
): MallLinkedProduct | null => {
  const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id);
  if (!linked || !isOwnerMatch(linked.ownerId, ownerId)) return null;

  const { id: settingId, ownerId: settingOwnerId, mallAccountId, mallId } = linked.settingSnapshot;
  const settingSnapshot = {
    ...structuredClone(body.settingSnapshot),
    id: settingId,
    ownerId: settingOwnerId,
    mallAccountId,
    mallId,
    mallCode: linked.mallCode,
  } as ShoppingSetting;

  // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 요청 본문과 공유되어 스냅샷 독립성이 깨진다.
  linked.productSnapshot = structuredClone(body.productSnapshot);
  linked.settingSnapshot = settingSnapshot;
  linked.updatedByEmail = body.updatedByEmail;
  linked.updatedAt = new Date().toISOString();

  return linked;
};
