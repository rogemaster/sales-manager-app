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
  shoppingAccountId: null,
  mallSyncAction: null,
  mallSyncError: null,
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
        mallAction: null,
        mallError: null,
      }),
    ).toEqual({ id: '7', modifiedAt: '2026-09-05 09:00:00', modifiedBy: '홍길동', changedFields: ['orderStatus'] });
  });
});

describe('몰 연동 실패 필드', () => {
  it('실패 사유가 있으면 응답에 싣고, 없으면 뺀다', () => {
    expect(toOrder({ ...baseRow, mallSyncAction: 'INVOICE', mallSyncError: '사유' })).toMatchObject({
      mallSyncAction: 'INVOICE',
      mallSyncError: '사유',
    });
    const order = toOrder(baseRow);
    expect(order.mallSyncAction).toBeUndefined();
    expect(order.mallSyncError).toBeUndefined();
  });

  it('쇼핑몰계정 ID를 싣는다 — 목록 화면의 발주확인 사전 경고가 계정 유무로 판정한다', () => {
    expect(toOrder({ ...baseRow, shoppingAccountId: 'acc_1' }).shoppingAccountId).toBe('acc_1');
    expect(toOrder(baseRow).shoppingAccountId).toBeUndefined();
  });

  it('이력의 몰 연동 동작·사유를 싣는다', () => {
    const history = toOrderEditHistory({
      id: 1,
      orderNumber: 'order_001',
      ownerId: 'usr_1',
      changedFields: [],
      modifiedByName: '홍길동',
      modifiedByEmail: 'a@b.c',
      modifiedAt: new Date('2026-10-02T01:00:00.000Z'),
      mallAction: 'CONFIRM',
      mallError: '쇼핑몰에서 주문을 찾을 수 없습니다.',
    });
    expect(history).toMatchObject({ mallAction: 'CONFIRM', mallError: '쇼핑몰에서 주문을 찾을 수 없습니다.' });
  });
});
