import { describe, expect, it } from 'vitest';
import { OrderRow, toOrder, toOrderEditHistory } from './orderRecord';

const baseRow: OrderRow = {
  orderNumber: 'order_001',
  ownerId: 'usr_1',
  shopOrderNumber: '111-222',
  mallCode: 'NSST',
  mallId: 'naver_store1',
  shopProductId: 'P-1',
  orderProductName: '상품',
  orderPrice: 10000,
  orderTotalQuantity: 1,
  orderOption: null,
  orderSubOption: null,
  orderSubTotalQuantity: null,
  orderDeliveryType: 'FREE',
  orderDeliveryPrice: 0,
  paymentDate: new Date('2026-09-04T15:30:00.000Z'),
  collectedAt: new Date('2026-09-05T01:00:00.000Z'),
  orderName: '주문자',
  orderPhoneNumber: '010-1234-5678',
  orderZipCode: '06236',
  orderAddress: '서울',
  orderDetailAddress: null,
  payeeName: '수취인',
  payeePhoneNumber: '010-1234-5678',
  payeeZipCode: '06236',
  payeeAddress: '서울',
  payeeDetailAddress: '101호',
  deliveryMessage: null,
  orderStatus: 'NEW_ORDER',
  deliveryCompany: null,
  invoiceNumber: null,
  invoiceRegisteredAt: null,
  invoiceSentAt: null,
};

describe('toOrder', () => {
  it('시각을 KST 문자열로 바꾼다 — UTC 전날 15:30은 KST 00:30', () => {
    const order = toOrder(baseRow);
    expect(order.paymentDate).toBe('2026-09-05 00:30:00');
    expect(order.orderCollectionDate).toBe('2026-09-05 10:00:00');
  });

  it('null인 선택 필드는 응답에서 빠진다', () => {
    const order = toOrder(baseRow);
    expect(order.orderDetailAddress).toBeUndefined();
    expect(order.invoiceRegisteredAt).toBeUndefined();
    expect(order.payeeDetailAddress).toBe('101호');
  });

  it('송장 날짜가 있으면 KST 문자열이다', () => {
    const order = toOrder({ ...baseRow, invoiceRegisteredAt: new Date('2026-09-06T00:00:00.000Z') });
    expect(order.invoiceRegisteredAt).toBe('2026-09-06 09:00:00');
  });
});

describe('toOrderEditHistory', () => {
  it('id는 문자열, 수정자는 이름이다', () => {
    expect(
      toOrderEditHistory({
        id: 7,
        orderNumber: 'order_001',
        ownerId: 'usr_1',
        changedFields: ['orderStatus'],
        modifiedByName: '홍길동',
        modifiedByEmail: 'a@b.c',
        modifiedAt: new Date('2026-09-05T00:00:00.000Z'),
      }),
    ).toEqual({ id: '7', modifiedAt: '2026-09-05 09:00:00', modifiedBy: '홍길동', changedFields: ['orderStatus'] });
  });
});
