import { describe, expect, it } from 'vitest';
import {
  formatOptionValues,
  NaverProductOrder,
  naverProductOrderPageSchema,
  toOrderFromNaver,
  UNKNOWN_DELIVERY_FEE_TYPE_MESSAGE,
  UNKNOWN_ORDER_STATUS_MESSAGE,
} from './naverOrderTranslate';

const NOW = new Date('2026-10-01T03:00:00.000Z');
const ACCOUNT = { id: 'acc_naver', ownerId: 'usr_1', mallCode: 'NSST' as const, mallId: 'naver_store1' };

const naverOrder = (overrides: Partial<NaverProductOrder> = {}): NaverProductOrder => ({
  productOrderId: '2026100112345678',
  orderId: '2026100187654321',
  productOrderStatus: 'PAYED',
  placeOrderStatus: 'NOT_YET',
  paymentDate: '2026-09-30T08:35:37.083Z',
  lastChangedDate: '2026-10-01T02:00:00.000Z',
  productNo: 7,
  productName: '이어폰',
  optionValues: { 색상: '블랙', 사이즈: 'L' },
  quantity: 2,
  unitPrice: 15000,
  totalPaymentAmount: 33000,
  deliveryFeeType: 'PAID',
  deliveryFeeAmount: 3000,
  orderer: { name: '김민준', tel: '010-1111-2222' },
  shippingAddress: {
    name: '이서연',
    tel: '010-3333-4444',
    zipCode: '06236',
    baseAddress: '서울특별시 강남구 테헤란로 152',
    detailAddress: '12층',
  },
  shippingMemo: '문 앞',
  delivery: null,
  claim: null,
  ...overrides,
});

describe('naverProductOrderPageSchema', () => {
  it('정상 응답은 통과한다', () => {
    expect(naverProductOrderPageSchema.safeParse({ productOrders: [naverOrder()], nextCursor: null }).success).toBe(
      true,
    );
  });

  it('필드가 빠지거나 타입이 틀리면 거절한다', () => {
    const missing: Record<string, unknown> = { ...naverOrder() };
    delete missing.productNo;
    expect(naverProductOrderPageSchema.safeParse({ productOrders: [missing], nextCursor: null }).success).toBe(false);
    expect(
      naverProductOrderPageSchema.safeParse({
        productOrders: [naverOrder({ quantity: '2' as never })],
        nextCursor: null,
      }).success,
    ).toBe(false);
    expect(naverProductOrderPageSchema.safeParse({ productOrders: [], nextCursor: 3 }).success).toBe(false);
  });

  it('해석할 수 없는 결제일은 거절한다', () => {
    expect(
      naverProductOrderPageSchema.safeParse({ productOrders: [naverOrder({ paymentDate: 'x' })], nextCursor: null })
        .success,
    ).toBe(false);
  });
});

describe('formatOptionValues', () => {
  it('키: 값을 / 로 잇고, 없으면 null', () => {
    expect(formatOptionValues({ 색상: '블랙', 사이즈: 'L' })).toBe('색상: 블랙 / 사이즈: L');
    expect(formatOptionValues(null)).toBeNull();
    expect(formatOptionValues({})).toBeNull();
  });
});

describe('toOrderFromNaver', () => {
  it('필드를 우리 주문으로 옮긴다 — 주문자 주소는 배송지로 채운다', () => {
    const result = toOrderFromNaver(naverOrder(), ACCOUNT, 'ord_1', NOW);
    expect(result).toEqual({
      ok: true,
      order: {
        orderNumber: 'ord_1',
        ownerId: 'usr_1',
        shopOrderNumber: '2026100112345678',
        mallCode: 'NSST',
        mallId: 'naver_store1',
        shoppingAccountId: 'acc_naver',
        shopProductId: '7',
        orderProductName: '이어폰',
        orderPrice: 33000,
        orderTotalQuantity: 2,
        orderOption: '색상: 블랙 / 사이즈: L',
        orderSubOption: null,
        orderSubTotalQuantity: null,
        orderDeliveryType: 'NOT_FREE',
        orderDeliveryPrice: 3000,
        paymentDate: new Date('2026-09-30T08:35:37.083Z'),
        collectedAt: NOW,
        orderName: '김민준',
        orderPhoneNumber: '010-1111-2222',
        orderZipCode: '06236',
        orderAddress: '서울특별시 강남구 테헤란로 152',
        orderDetailAddress: '12층',
        payeeName: '이서연',
        payeePhoneNumber: '010-3333-4444',
        payeeZipCode: '06236',
        payeeAddress: '서울특별시 강남구 테헤란로 152',
        payeeDetailAddress: '12층',
        deliveryMessage: '문 앞',
        orderStatus: 'NEW_ORDER',
        deliveryCompany: null,
        invoiceNumber: null,
        invoiceSentAt: null,
      },
    });
  });

  it('발주확인된 주문은 발주확인 상태다', () => {
    const result = toOrderFromNaver(naverOrder({ placeOrderStatus: 'OK' }), ACCOUNT, 'ord_1', NOW);
    expect(result.ok && result.order.orderStatus).toBe('CONFIRMED_ORDER');
  });

  it('배송중이면 송장전송완료이고 송장 세 필드를 채운다', () => {
    const result = toOrderFromNaver(
      naverOrder({
        productOrderStatus: 'DELIVERING',
        placeOrderStatus: 'OK',
        delivery: { deliveryCompany: 'CJ', trackingNumber: '123', dispatchedDate: '2026-10-01T01:00:00.000Z' },
      }),
      ACCOUNT,
      'ord_1',
      NOW,
    );
    expect(result.ok && result.order).toMatchObject({
      orderStatus: 'INVOICE_COMPLETE',
      deliveryCompany: 'CJ',
      invoiceNumber: '123',
      invoiceSentAt: new Date('2026-10-01T01:00:00.000Z'),
    });
  });

  it('배송 유형은 PAID만 이름이 다르다', () => {
    for (const [naver, ours] of [
      ['FREE', 'FREE'],
      ['CONDITIONAL_FREE', 'CONDITIONAL_FREE'],
      ['CHARGE_RECEIVED', 'CHARGE_RECEIVED'],
    ]) {
      const result = toOrderFromNaver(naverOrder({ deliveryFeeType: naver }), ACCOUNT, 'ord_1', NOW);
      expect(result.ok && result.order.orderDeliveryType).toBe(ours);
    }
  });

  it('알 수 없는 상태는 실패다 — 배송중인데 배송 정보가 없어도 실패다', () => {
    expect(toOrderFromNaver(naverOrder({ productOrderStatus: 'CANCELED' }), ACCOUNT, 'ord_1', NOW)).toEqual({
      ok: false,
      message: UNKNOWN_ORDER_STATUS_MESSAGE,
    });
    expect(
      toOrderFromNaver(naverOrder({ productOrderStatus: 'DELIVERING', placeOrderStatus: 'OK' }), ACCOUNT, 'ord_1', NOW),
    ).toEqual({ ok: false, message: UNKNOWN_ORDER_STATUS_MESSAGE });
  });

  it('알 수 없는 배송 유형은 실패다', () => {
    expect(toOrderFromNaver(naverOrder({ deliveryFeeType: 'X' }), ACCOUNT, 'ord_1', NOW)).toEqual({
      ok: false,
      message: UNKNOWN_DELIVERY_FEE_TYPE_MESSAGE,
    });
  });

  it('빈 상세주소·배송메시지는 null이다', () => {
    const result = toOrderFromNaver(
      naverOrder({
        shippingMemo: null,
        shippingAddress: { ...naverOrder().shippingAddress, detailAddress: '' },
        optionValues: null,
      }),
      ACCOUNT,
      'ord_1',
      NOW,
    );
    expect(result.ok && result.order).toMatchObject({
      orderDetailAddress: null,
      payeeDetailAddress: null,
      deliveryMessage: null,
      orderOption: null,
    });
  });
});
