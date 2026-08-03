import {
  CreateMallLinkedProductsResult,
  MallLinkedProduct,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import {
  createExternalProductId,
  createLinkedProductId,
  isSendSuccess,
  nextSequence,
  resolveErrorMessage,
} from './mallLinkSimulation';

/**
 * 전송 시점의 상품·설정 값을 스냅샷으로 복사해 연동 데이터를 새로 만든다.
 * 같은 조합이 이미 있어도 갱신하지 않고 항상 새 건을 추가한다 — 연동 데이터 1건 = 외부몰 상품 1개.
 */
export const createMockMallLinkedProducts = (
  items: MallLinkedProductRequestItem[],
  ownerId: string,
  createdByEmail: string,
): CreateMallLinkedProductsResult => {
  const now = new Date().toISOString();
  const result: CreateMallLinkedProductsResult = { totalCount: 0, successCount: 0, failCount: 0 };

  items.forEach((item) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === item.shoppingSettingId);
    if (!product || !setting) return;

    const isSuccess = isSendSuccess();
    // 실패 사유 판정은 이번 건을 배열에 넣기 전에 해야 한다. 넣은 뒤에 하면 자기 자신을 중복으로 본다.
    // mallCode는 클라이언트가 보낸 item이 아니라 조회된 setting에서 가져온다 — 어긋난 쌍이 오면
    // settingSnapshot.mallCode와 레코드의 mallCode가 갈라져 몰/쇼핑몰계정 필터가 서로 다른 답을 낸다.
    const errorMessage = isSuccess ? undefined : resolveErrorMessage(item.productId, setting.mallCode, ownerId);
    const sequence = nextSequence();

    const linked: MallLinkedProduct = {
      id: createLinkedProductId(sequence),
      ownerId,
      sourceProductId: product.productId,
      sourceShoppingSettingId: setting.id,
      mallCode: setting.mallCode,
      status: isSuccess ? 'success' : 'failed',
      externalProductId: isSuccess ? createExternalProductId(setting.mallCode, sequence) : undefined,
      errorMessage,
      // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 오리지널과 공유되어 스냅샷 독립성이 깨진다.
      productSnapshot: structuredClone(product),
      settingSnapshot: structuredClone(setting),
      createdByEmail,
      createdAt: now,
      lastSentAt: now,
      updatedAt: now,
    };

    MOCK_MALL_LINKED_PRODUCT_DATA.push(linked);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
