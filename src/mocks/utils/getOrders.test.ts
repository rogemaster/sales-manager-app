import { describe, it, expect, vi } from 'vitest';
import { OrderSearchType } from '@/features/order/types/order.types';
import type { Order } from '@/features/order/types/order.types';

// vi.mock()은 파일 상단으로 호이스팅되므로, 픽스처 데이터는 vi.hoisted()로 먼저 정의한다
const { ORDERS } = vi.hoisted(() => {
  const makeOrder = (overrides: Partial<Order>): Order => ({
    orderNumber: 'ORD-001',
    shopOrderNumber: 'SHOP-001',
    orderStatus: 'NEW_ORDER',
    paymentDate: '2024-01-15',
    orderCollectionDate: '2024-01-15',
    mallCode: 'COUP',
    mallId: 'mall-1',
    shopProductId: 'prod-1',
    orderProductName: '나이키 운동화',
    orderPrice: 100000,
    orderTotalQuantity: 1,
    orderDeliveryType: 'FREE',
    orderDeliveryPrice: 0,
    orderName: '홍길동',
    payeeName: '홍길동',
    orderPhoneNumber: '010-1234-5678',
    payeePhoneNumber: '010-1234-5678',
    orderZipCode: '12345',
    orderAddress: '서울시 강남구',
    payeeZipCode: '12345',
    payeeAddress: '서울시 강남구',
    ownerId: 'owner-1',
    ...overrides,
  });

  return {
    ORDERS: [
      makeOrder({ orderNumber: 'ORD-001', mallCode: 'COUP', mallId: 'mall-1', orderStatus: 'NEW_ORDER', paymentDate: '2024-01-15', orderName: '홍길동', orderProductName: '나이키 운동화' }),
      makeOrder({ orderNumber: 'ORD-002', mallCode: 'NSST', mallId: 'mall-2', orderStatus: 'CONFIRMED_ORDER', paymentDate: '2024-01-20', orderName: '김철수', orderProductName: '아디다스 슬리퍼' }),
      makeOrder({ orderNumber: 'ORD-003', mallCode: 'COUP', mallId: 'mall-1', orderStatus: 'INVOICE_REGISTER', paymentDate: '2024-02-01', orderName: '이영희', orderProductName: '뉴발란스 운동화' }),
      makeOrder({ orderNumber: 'ORD-004', ownerId: 'owner-2', mallCode: 'COUP', mallId: 'mall-1', orderStatus: 'NEW_ORDER', paymentDate: '2024-01-15', orderName: '박민수', orderProductName: '타 owner 주문' }),
    ],
  };
});

// faker 데이터 대신 위에서 정의한 고정 픽스처로 교체
vi.mock('../data/MockOrdersData', () => ({
  MOCK_ORDERS_DATA: ORDERS,
}));

import { getMockOrders } from './getOrders';

// 모든 테스트에서 공통으로 쓰는 기본 필터 (날짜 범위 안에 픽스처 3개 전부 포함)
const defaultFilters: OrderSearchType = {
  dateType: 'paymentDate',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  mallCode: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: 'ALL',
  searchType: 'orderName',
  searchValue: '',
};

// ─── getMockOrders ────────────────────────────────────────────────────────────

describe('getMockOrders', () => {
  describe('필터 없음', () => {
    it('아무 필터도 없으면 전체 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 10);
      expect(result.total).toBe(3);
      expect(result.orders).toHaveLength(3);
    });
  });

  describe('owner 필터', () => {
    it('ownerId가 다른 주문은 제외한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 10);
      expect(result.orders.find((o) => o.orderNumber === 'ORD-004')).toBeUndefined();
    });

    it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
      const result = getMockOrders('owner-999', defaultFilters, 1, 10);
      expect(result.total).toBe(0);
    });
  });

  describe('쇼핑몰 필터', () => {
    it("'COUP'만 필터링하면 COUP 주문 2개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallCode: 'COUP' }, 1, 10);
      expect(result.total).toBe(2);
      result.orders.forEach((o) => expect(o.mallCode).toBe('COUP'));
    });

    it("'NSST'만 필터링하면 NSST 주문 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallCode: 'NSST' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });

    it("'ALL'이면 전체를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallCode: 'ALL' }, 1, 10);
      expect(result.total).toBe(3);
    });
  });

  describe('아이디 필터', () => {
    it("'mall-1' 아이디만 필터링하면 2개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallId: 'mall-1' }, 1, 10);
      expect(result.total).toBe(2);
      result.orders.forEach((o) => expect(o.mallId).toBe('mall-1'));
    });

    it("'mall-2' 아이디만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallId: 'mall-2' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });
  });

  describe('주문 상태 필터', () => {
    it("'NEW_ORDER' 상태만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'NEW_ORDER' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-001');
    });

    it("'CONFIRMED_ORDER' 상태만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'CONFIRMED_ORDER' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });

    it("'ALL'이면 전체를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'ALL' }, 1, 10);
      expect(result.total).toBe(3);
    });
  });

  describe('검색 필터', () => {
    it('searchType orderName으로 검색하면 주문자명이 일치하는 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderName', searchValue: '홍길동' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-001');
    });

    it('searchType orderProductName으로 검색하면 상품명에 키워드가 포함된 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderProductName', searchValue: '운동화' }, 1, 10);
      expect(result.total).toBe(2); // 나이키 운동화, 뉴발란스 운동화
    });

    it('searchType orderNumber로 검색하면 주문번호가 일치하는 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderNumber', searchValue: 'ORD-002' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });

    it('존재하지 않는 searchType이면 전체를 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'unknown', searchValue: '홍길동' }, 1, 10);
      expect(result.total).toBe(3);
    });

    it('searchValue가 빈 문자열이면 전체를 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderName', searchValue: '' }, 1, 10);
      expect(result.total).toBe(3);
    });
  });

  describe('날짜 필터', () => {
    it('범위 안의 날짜만 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, startDate: '2024-01-01', endDate: '2024-01-19' }, 1, 10);
      expect(result.total).toBe(1); // ORD-001 (2024-01-15)만 포함
      expect(result.orders[0].orderNumber).toBe('ORD-001');
    });

    it('dateType이 orderCollectionDate이면 수집일 기준으로 필터링한다', () => {
      const result = getMockOrders('owner-1',
        { ...defaultFilters, dateType: 'orderCollectionDate', startDate: '2024-01-01', endDate: '2024-12-31' },
        1,
        10,
      );
      expect(result.total).toBe(3);
    });
  });

  describe('페이지네이션', () => {
    it('page 1, pageSize 2면 첫 두 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 2);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].orderNumber).toBe('ORD-001');
      expect(result.orders[1].orderNumber).toBe('ORD-002');
    });

    it('page 2, pageSize 2면 나머지 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 2, 2);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderNumber).toBe('ORD-003');
    });

    it('3개 데이터에 pageSize 2면 totalPages가 2다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 2);
      expect(result.totalPages).toBe(2);
    });

    it('결과가 0개면 totalPages가 1이다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'REQUEST_CANCEL' }, 1, 10);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('응답에 page와 pageSize가 포함된다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 2, 5);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
    });
  });
});
