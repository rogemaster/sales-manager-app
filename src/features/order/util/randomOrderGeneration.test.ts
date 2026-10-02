import { describe, expect, it } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import {
  buildRandomOrders,
  countRandomOrders,
  createShopOrderNumber,
  Random,
  RandomOrderSource,
  resolvePaymentWindow,
  toRandomOrderSource,
} from './randomOrderGeneration';

const NOW = new Date('2026-10-01T03:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);
const fixed =
  (value: number): Random =>
  () =>
    value;
const ACCOUNT = { id: 'acc_coup', ownerId: 'usr_1', mallCode: 'COUP' as const, mallId: 'coupang_seller1' };
const WIDE = { start: minutesAgo(7 * 24 * 60), endExclusive: new Date(NOW.getTime() + 24 * 60 * 60_000) };

const source = (overrides: Partial<RandomOrderSource> = {}): RandomOrderSource => ({
  shopProductId: 'EXT-1',
  name: '쿠팡 상품',
  price: 10000,
  deliveryType: 'NOT_FREE',
  deliveryPrice: 3000,
  options: [],
  ...overrides,
});

let seq = 0;
const newOrderNumber = () => `ord_${++seq}`;

describe('countRandomOrders', () => {
  it('처음 5건, 30분마다 1건, 최대 5건', () => {
    expect(countRandomOrders(null, NOW)).toBe(5);
    expect(countRandomOrders(minutesAgo(29), NOW)).toBe(0);
    expect(countRandomOrders(minutesAgo(60), NOW)).toBe(2);
    expect(countRandomOrders(minutesAgo(600), NOW)).toBe(5);
    expect(countRandomOrders(new Date(NOW.getTime() + 60_000), NOW)).toBe(0);
  });
});

describe('resolvePaymentWindow', () => {
  it('수집 기간과 [생성 시각, 지금]의 교집합이다', () => {
    expect(resolvePaymentWindow(WIDE, minutesAgo(60), NOW)).toEqual({ from: minutesAgo(60), to: NOW });
    const narrow = { start: minutesAgo(30), endExclusive: minutesAgo(10) };
    expect(resolvePaymentWindow(narrow, minutesAgo(60), NOW)).toEqual({ from: minutesAgo(30), to: minutesAgo(10) });
  });

  it('처음이면 지금 − 24시간부터다', () => {
    expect(resolvePaymentWindow(WIDE, null, NOW)).toEqual({ from: minutesAgo(24 * 60), to: NOW });
  });

  it('겹치는 구간이 없으면 null', () => {
    const past = { start: minutesAgo(10 * 24 * 60), endExclusive: minutesAgo(9 * 24 * 60) };
    expect(resolvePaymentWindow(past, minutesAgo(60), NOW)).toBeNull();
  });
});

describe('toRandomOrderSource', () => {
  const product = (overrides: Partial<Product> = {}) =>
    ({ productId: 'P1', name: '상품', price: 10000, deliveryType: 'FREE', deliveryPrice: 0, ...overrides }) as Product;

  it('몰 상품코드가 있으면 그것을, 없으면 우리 상품ID를 쓴다', () => {
    expect(toRandomOrderSource(product(), 'EXT-9')?.shopProductId).toBe('EXT-9');
    expect(toRandomOrderSource(product(), null)?.shopProductId).toBe('P1');
  });

  it('배송 유형이 코드값이 아니면 null', () => {
    expect(toRandomOrderSource(product({ deliveryType: '무료' }), null)).toBeNull();
  });

  it('옵션이 없으면 빈 배열', () => {
    expect(toRandomOrderSource(product(), null)?.options).toEqual([]);
  });
});

describe('createShopOrderNumber', () => {
  it('KST 날짜 8자리 + 8자리', () => {
    expect(createShopOrderNumber(new Date('2026-09-30T16:00:00.000Z'), fixed(0))).toBe('2026100100000000');
  });
});

describe('buildRandomOrders', () => {
  const build = (overrides: Partial<Parameters<typeof buildRandomOrders>[0]> = {}) =>
    buildRandomOrders({
      sources: [source()],
      account: ACCOUNT,
      generatedAt: minutesAgo(60),
      period: WIDE,
      now: NOW,
      random: fixed(0),
      newOrderNumber,
      ...overrides,
    });

  it('경과 시간만큼 신규주문을 만든다', () => {
    const orders = build();
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({
      ownerId: 'usr_1',
      mallCode: 'COUP',
      mallId: 'coupang_seller1',
      shoppingAccountId: 'acc_coup',
      shopProductId: 'EXT-1',
      orderProductName: '쿠팡 상품',
      orderTotalQuantity: 1,
      orderPrice: 13000,
      orderDeliveryType: 'NOT_FREE',
      orderDeliveryPrice: 3000,
      orderStatus: 'NEW_ORDER',
      paymentDate: minutesAgo(60),
      collectedAt: NOW,
    });
    expect(orders[0].shopOrderNumber).toMatch(/^20261001\d{8}$/);
  });

  it('옵션가를 단가에 더하고 무료배송이면 배송비 0', () => {
    const [order] = build({
      sources: [
        source({
          deliveryType: 'FREE',
          options: [{ values: { 색상: '빨강' }, quantity: 1, skuCode: '', optionPrice: 2000 }],
        }),
      ],
      random: fixed(0.99),
    });
    expect(order).toMatchObject({
      orderTotalQuantity: 3,
      orderPrice: 12000 * 3,
      orderDeliveryPrice: 0,
      orderOption: '색상: 빨강',
    });
  });

  it('연동상품이 없으면 만들지 않는다', () => {
    expect(build({ sources: [] })).toEqual([]);
  });

  it('겹치는 구간이 없으면 만들지 않는다', () => {
    expect(build({ period: { start: minutesAgo(10 * 24 * 60), endExclusive: minutesAgo(9 * 24 * 60) } })).toEqual([]);
  });

  it('30분이 안 지났으면 만들지 않는다', () => {
    expect(build({ generatedAt: minutesAgo(10) })).toEqual([]);
  });
});
