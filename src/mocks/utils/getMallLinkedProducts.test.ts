import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type {
  MallLinkedProduct,
  MallLinkedProductSearch,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const { LINKED, resetLinked } = vi.hoisted(() => {
  const makeLinked = (overrides: Partial<MallLinkedProduct>): MallLinkedProduct =>
    ({
      id: 'mlp_001',
      ownerId: 'usr_001',
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: 'ext_NSST_aaa111',
      productSnapshot: { productId: 'p_001', name: '기본상품', state: 'ON_SALE' } as Product,
      settingSnapshot: { id: 'ss_001', nickname: '기본설정' } as ShoppingSetting,
      createdByEmail: 'seller@shop.com',
      createdAt: '2026-07-10T00:00:00.000Z',
      lastSentAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
      ...overrides,
    }) as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetLinked = () => {
    LINKED.length = 0;
    LINKED.push(
      makeLinked({ id: 'mlp_001' }),
      makeLinked({
        id: 'mlp_002',
        sourceProductId: 'p_002',
        sourceShoppingSettingId: 'ss_002',
        mallCode: 'COUP',
        status: 'failed',
        externalProductId: undefined,
        errorMessage: '외부 쇼핑몰 전송 실패',
        productSnapshot: { productId: 'p_002', name: '품절상품', state: 'SOLD_OUT' } as Product,
        settingSnapshot: { id: 'ss_002', nickname: '쿠팡설정' } as ShoppingSetting,
        createdByEmail: 'staff@shop.com',
        updatedByEmail: 'boss@shop.com',
        lastSentAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-25T00:00:00.000Z',
      }),
      makeLinked({
        id: 'mlp_003',
        ownerId: 'usr_999',
        sourceProductId: 'p_003',
        productSnapshot: { productId: 'p_003', name: '남의상품', state: 'ON_SALE' } as Product,
      }),
    );
  };

  resetLinked();

  return { LINKED, resetLinked };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { getMockMallLinkedProducts } from './getMallLinkedProducts';

const BASE_SEARCH: MallLinkedProductSearch = {
  dateType: 'lastSentAt',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  mallCode: 'ALL',
  shoppingSettingId: 'ALL',
  linkStatus: 'ALL',
  saleState: 'ALL',
  searchType: 'productName',
  searchValue: '',
};

const search = (overrides: Partial<MallLinkedProductSearch> = {}) => ({ ...BASE_SEARCH, ...overrides });

describe('getMockMallLinkedProducts', () => {
  beforeEach(() => {
    resetLinked();
  });

  it('로그인 계정의 ownerId에 해당하는 연동 데이터만 반환한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search(), 1, 10);

    expect(result.total).toBe(2);
    // 기본 정렬은 lastSentAt 내림차순 — mlp_002(2026-07-20)가 mlp_001(2026-07-10)보다 먼저 온다.
    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002', 'mlp_001']);
  });

  it('몰 코드로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ mallCode: 'COUP' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('쇼핑몰 설정으로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ shoppingSettingId: 'ss_002' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('연동 상태로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ linkStatus: 'failed' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('스냅샷의 판매상태로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ saleState: 'SOLD_OUT' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('기간 필터는 dateType에 따라 lastSentAt과 updatedAt을 각각 본다', () => {
    const byLastSent = getMockMallLinkedProducts(
      'usr_001',
      search({ dateType: 'lastSentAt', startDate: '2026-07-19', endDate: '2026-07-21' }),
      1,
      10,
    );
    expect(byLastSent.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);

    const byUpdated = getMockMallLinkedProducts(
      'usr_001',
      search({ dateType: 'updatedAt', startDate: '2026-07-19', endDate: '2026-07-21' }),
      1,
      10,
    );
    expect(byUpdated.total).toBe(0);
  });

  it.each([
    ['productName' as const, '품절', 'mlp_002'],
    ['productCode' as const, 'p_002', 'mlp_002'],
    ['externalProductCode' as const, 'aaa111', 'mlp_001'],
    ['createdBy' as const, 'staff@', 'mlp_002'],
    ['updatedBy' as const, 'boss@', 'mlp_002'],
  ])('검색 타입 %s로 검색어를 매칭한다', (searchType, searchValue, expectedId) => {
    const result = getMockMallLinkedProducts('usr_001', search({ searchType, searchValue }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual([expectedId]);
  });

  it('페이지 크기에 맞춰 잘라내고 페이지 정보를 반환한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search(), 2, 1);

    expect(result).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    // 내림차순 정렬 후 자르므로 2페이지(마지막)에는 lastSentAt이 가장 이른 mlp_001이 온다.
    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_001']);
  });

  it('조건에 맞는 데이터가 없으면 빈 배열과 totalPages 1을 반환한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ searchValue: '없는상품' }), 1, 10);

    expect(result.linkedProducts).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it('최종연동일시(lastSentAt) 내림차순으로 정렬한다 — 삽입 순서와 무관하다', () => {
    // 삽입 순서상 mlp_001(2026-07-10)이 mlp_002(2026-07-20)보다 먼저지만,
    // lastSentAt 기준으로는 mlp_002가 더 최근이므로 결과에서 먼저 나와야 한다.
    const result = getMockMallLinkedProducts('usr_001', search(), 1, 10);

    const lastSentTimes = result.linkedProducts.map((item) => new Date(item.lastSentAt).getTime());
    const sortedDesc = [...lastSentTimes].sort((a, b) => b - a);
    expect(lastSentTimes).toEqual(sortedDesc);
    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002', 'mlp_001']);
  });
});
