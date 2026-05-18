import { OrderClaim, OrderComment, OrderEditHistory } from '@/features/order/types/order.types';

export const MOCK_ORDER_CLAIMS: Record<string, OrderClaim> = {
  'order_sample_001': {
    claimType: 'RETURN',
    claimMessage: '단순 변심으로 인한 반품 요청입니다.',
    handlerNote: '반품 접수 완료, 수거 예정',
  },
  'order_sample_005': {
    claimType: 'CANCEL',
    claimMessage: '구매 의사 없어졌습니다.',
    handlerNote: '',
  },
  'order_sample_008': {
    claimType: 'EXCHANGE',
    claimMessage: '사이즈가 맞지 않아 교환 요청합니다.',
    handlerNote: '교환 상품 발송 준비 중',
  },
};

export const MOCK_ORDER_COMMENTS: Record<string, OrderComment[]> = {
  'order_sample_001': [
    { id: 'comment_001', content: '배송지 변경 요청 확인했습니다.', authorName: '홍길동', createdAt: '2026-01-03 09:30' },
    { id: 'comment_002', content: '고객 연락 완료. 수거 일정 협의 중.', authorName: '김담당', createdAt: '2026-01-04 14:15' },
  ],
  'order_sample_002': [
    { id: 'comment_003', content: '발주 확인 완료.', authorName: '이관리', createdAt: '2026-01-08 11:30' },
  ],
};

export const MOCK_ORDER_HISTORIES: Record<string, OrderEditHistory[]> = {
  'order_sample_001': [
    { id: 'history_001', modifiedAt: '2026-01-03 10:00', modifiedBy: '홍길동', changedFields: ['payeeName', 'payeeAddress'] },
    { id: 'history_002', modifiedAt: '2026-01-05 16:20', modifiedBy: '김담당', changedFields: ['orderStatus', 'claim.handlerNote'] },
  ],
  'order_sample_002': [
    { id: 'history_003', modifiedAt: '2026-01-08 11:00', modifiedBy: '이관리', changedFields: ['orderStatus'] },
  ],
};

export const MOCK_ORDER_DETAIL_EXTRAS: Record<string, { orderDetailAddress?: string; payeeDetailAddress?: string }> = {
  'order_sample_001': { orderDetailAddress: '101동 202호', payeeDetailAddress: '101동 202호' },
  'order_sample_002': { orderDetailAddress: '3층 사무실' },
};
