import { describe, expect, it } from 'vitest';
import {
  buildOrderDraft,
  buildOrderDrafts,
  countOrdersToGenerate,
  createOrderNumber,
  ORDER_GENERATION_MAX,
  type Random,
} from './orderGeneration';
import type { NaverProductRequest, NaverStoredProduct } from './types';

const NOW = new Date('2026-10-01T03:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);
const fixed =
  (value: number): Random =>
  () =>
    value;

const BASE_PAYLOAD: NaverProductRequest = {
  name: '테스트 상품',
  statusType: 'SALE',
  leafCategoryId: 'CAT_1',
  detailContent: '<p>상세</p>',
  images: { representativeImage: { url: 'https://cdn.example.com/a.png' } },
  salePrice: 10000,
  stockQuantity: 5,
  deliveryInfo: {
    deliveryFeeType: 'PAID',
    baseFee: 3000,
    deliveryCompany: 'CJ',
    shippingAddressId: 'ADDR_S1',
    returnAddressId: 'ADDR_R1',
  },
  brandName: '브랜드',
  manufacturerName: '제조사',
  productInfoProvidedNotice: { type: 'ETC' },
};

const product = (payload: Partial<NaverProductRequest> = {}): NaverStoredProduct => ({
  productNo: 7,
  sellerId: 'seller_1',
  name: '테스트 상품',
  statusType: 'SALE',
  payload: { ...BASE_PAYLOAD, ...payload },
});

describe('countOrdersToGenerate', () => {
  it('처음이면 최대 건수다', () => {
    expect(countOrdersToGenerate(null, NOW)).toBe(ORDER_GENERATION_MAX);
  });

  it('30분마다 1건이고 상한은 5건이다', () => {
    expect(countOrdersToGenerate(minutesAgo(29), NOW)).toBe(0);
    expect(countOrdersToGenerate(minutesAgo(60), NOW)).toBe(2);
    expect(countOrdersToGenerate(minutesAgo(600), NOW)).toBe(5);
  });

  it('생성 시각이 지금보다 뒤면(시계 차이) 0건이다', () => {
    expect(countOrdersToGenerate(new Date(NOW.getTime() + 60_000), NOW)).toBe(0);
  });
});

describe('buildOrderDraft', () => {
  const windowStart = minutesAgo(60);

  it('옵션이 없으면 판매가가 단가이고 결제금액에 배송비를 더한다', () => {
    const draft = buildOrderDraft(product(), windowStart, NOW, fixed(0));
    expect(draft.productNo).toBe(7);
    expect(draft.payload.productName).toBe('테스트 상품');
    expect(draft.payload.optionValues).toBeNull();
    expect(draft.payload.quantity).toBe(1);
    expect(draft.payload.unitPrice).toBe(10000);
    expect(draft.payload.deliveryFeeType).toBe('PAID');
    expect(draft.payload.deliveryFeeAmount).toBe(3000);
    expect(draft.payload.totalPaymentAmount).toBe(13000);
  });

  it('옵션이 있으면 하나를 골라 옵션가를 단가에 더한다', () => {
    const withOption = product({
      optionCombinations: [{ values: { 색상: '빨강' }, quantity: 3, skuCode: '', optionPrice: 2000 }],
    });
    const draft = buildOrderDraft(withOption, windowStart, NOW, fixed(0.99));
    expect(draft.payload.optionValues).toEqual({ 색상: '빨강' });
    expect(draft.payload.quantity).toBe(3);
    expect(draft.payload.unitPrice).toBe(12000);
    expect(draft.payload.totalPaymentAmount).toBe(12000 * 3 + 3000);
  });

  it('무료배송이면 기본 배송비가 있어도 0원이다', () => {
    const free = product({ deliveryInfo: { ...BASE_PAYLOAD.deliveryInfo, deliveryFeeType: 'FREE', baseFee: 3000 } });
    const draft = buildOrderDraft(free, windowStart, NOW, fixed(0));
    expect(draft.payload.deliveryFeeAmount).toBe(0);
    expect(draft.payload.totalPaymentAmount).toBe(10000);
  });

  it('결제일은 창 시작 ~ 지금 사이다', () => {
    expect(buildOrderDraft(product(), windowStart, NOW, fixed(0)).paymentDate).toEqual(windowStart);
    const late = buildOrderDraft(product(), windowStart, NOW, fixed(0.99)).paymentDate;
    expect(late.getTime()).toBeGreaterThan(windowStart.getTime());
    expect(late.getTime()).toBeLessThan(NOW.getTime());
  });

  it('난수가 0.5 미만이면 수취인은 주문자와 같은 사람이다', () => {
    const draft = buildOrderDraft(product(), windowStart, NOW, fixed(0));
    expect(draft.payload.shippingAddress.name).toBe(draft.payload.orderer.name);
    expect(draft.payload.shippingAddress.tel).toBe(draft.payload.orderer.tel);
  });
});

describe('buildOrderDrafts', () => {
  it('상품이 없으면 만들지 않는다', () => {
    expect(buildOrderDrafts([], null, NOW, fixed(0))).toEqual([]);
  });

  it('건수만큼 만든다', () => {
    expect(buildOrderDrafts([product()], minutesAgo(60), NOW, fixed(0))).toHaveLength(2);
    expect(buildOrderDrafts([product()], null, NOW, fixed(0))).toHaveLength(5);
  });

  it('처음이면 결제일 창은 지금 − 24시간부터다', () => {
    const [draft] = buildOrderDrafts([product()], null, NOW, fixed(0));
    expect(draft.paymentDate).toEqual(new Date(NOW.getTime() - 24 * 60 * 60_000));
  });
});

describe('createOrderNumber', () => {
  it('KST 날짜 8자리 + 8자리 숫자다', () => {
    // UTC 9월 30일 16시 = KST 10월 1일 01시
    expect(createOrderNumber(new Date('2026-09-30T16:00:00.000Z'), fixed(0))).toBe('2026100100000000');
    expect(createOrderNumber(NOW, fixed(0.5))).toMatch(/^20261001\d{8}$/);
  });
});
