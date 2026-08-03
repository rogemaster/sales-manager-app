import {
  MallLinkedProduct,
  ResendMallLinkedProductsResult,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import {
  createExternalProductId,
  isSendSuccess,
  nextSequence,
  resolveErrorMessage,
  resolveResendErrorMessage,
} from './mallLinkSimulation';

/** 연동 1건을 외부몰로 다시 보낸다. 성공 여부를 반환한다. */
const sendOnce = (linked: MallLinkedProduct, ownerId: string, now: string): boolean => {
  const isSuccess = isSendSuccess();
  const sequence = nextSequence();

  if (isSuccess) {
    // 이미 외부몰에 상품이 있으면 그 상품을 수정한 것이므로 코드를 유지한다.
    // 없으면(실패 이력만 있던 건) 이번이 첫 등록이라 새로 발급한다.
    linked.externalProductId = linked.externalProductId ?? createExternalProductId(linked.mallCode, sequence);
    linked.status = 'success';
    linked.errorMessage = undefined;
  } else {
    // externalProductId가 있다는 건 외부몰에 이미 상품이 있다는 뜻이고, 그 전송은 신규 등록이 아니라
    // '수정'이라 중복이라는 개념이 성립하지 않는다. 없을 때만 신규 등록 기준의 중복 판정을 쓴다.
    linked.errorMessage = linked.externalProductId
      ? resolveResendErrorMessage(linked.mallCode)
      : resolveErrorMessage(linked.sourceProductId, linked.mallCode, ownerId);
    linked.status = 'failed';
    // 실패해도 externalProductId는 지우지 않는다 — 외부몰 상품은 이전 값 그대로 살아있다.
  }

  linked.lastSentAt = now;
  return isSuccess;
};

/**
 * 선택된 연동 데이터를 외부몰로 다시 보낸다.
 * 스냅샷과 수정 필드(updatedAt·updatedByEmail)는 건드리지 않는다 —
 * 재전송은 값을 고치는 행위가 아니라 현재 값을 보내는 행위다.
 */
export const resendMockMallLinkedProducts = (ids: string[], ownerId: string): ResendMallLinkedProductsResult => {
  const now = new Date().toISOString();
  const result: ResendMallLinkedProductsResult = { totalCount: 0, successCount: 0, failCount: 0 };

  ids.forEach((id) => {
    const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id && item.ownerId === ownerId);
    if (!linked) return;

    const isSuccess = sendOnce(linked, ownerId, now);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
