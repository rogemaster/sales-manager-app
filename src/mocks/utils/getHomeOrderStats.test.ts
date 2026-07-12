import { describe, it, expect, vi } from 'vitest';
import type { Order } from '@/features/order/types/order.types';

const makeOrder = (overrides: Partial<Order>): Order => ({
  orderNumber: 'ORD-001',
  shopOrderNumber: 'SHOP-001',
  orderStatus: 'NEW_ORDER',
  paymentDate: '2024-01-15',
  orderCollectionDate: '2024-01-15',
  shoppingMallName: 'COUP',
  shoppingMallId: 'mall-1',
  shopProductId: 'prod-1',
  orderProductName: '상품',
  orderPrice: 10000,
  orderTotalQuantity: 1,
  orderDeliveryType: 'FREE',
  orderDeliveryPrice: 0,
  orderName: '주문자',
  payeeName: '수취인',
  orderPhoneNumber: '010-0000-0000',
  payeePhoneNumber: '010-0000-0000',
  orderZipCode: '00000',
  orderAddress: '주소',
  payeeZipCode: '00000',
  payeeAddress: '주소',
  ownerId: 'owner-1',
  ...overrides,
});

const { ORDERS } = vi.hoisted(() => ({ ORDERS: [] as Order[] }));
vi.mock('../data/MockOrdersData', () => ({ MOCK_ORDERS_DATA: ORDERS }));

ORDERS.push(
  makeOrder({ orderNumber: 'ORD-001', ownerId: 'owner-1', orderStatus: 'NEW_ORDER', orderCollectionDate: '2024-01-15' }),
  makeOrder({ orderNumber: 'ORD-002', ownerId: 'owner-1', orderStatus: 'CONFIRMED_ORDER', orderCollectionDate: '2024-01-16' }),
  makeOrder({ orderNumber: 'ORD-003', ownerId: 'owner-2', orderStatus: 'NEW_ORDER', orderCollectionDate: '2024-01-15' }),
);

import { getMockHomeOrderStats } from './getHomeOrderStats';

describe('getMockHomeOrderStats', () => {
  it('ownerId가 일치하는 주문만 집계한다', () => {
    const result = getMockHomeOrderStats('owner-1', '2024-01-01', '2024-01-31');
    expect(result.newOrder).toBe(1);
    expect(result.confirmedOrder).toBe(1);
  });

  it('다른 owner의 주문은 집계에서 제외한다', () => {
    const result = getMockHomeOrderStats('owner-2', '2024-01-01', '2024-01-31');
    expect(result.newOrder).toBe(1);
    expect(result.confirmedOrder).toBe(0);
  });
});
