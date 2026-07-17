import { describe, it, expect, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const makeProduct = (overrides: Partial<Product>): Product => ({
  productId: 'smp000001',
  name: '테스트 상품',
  categoryId: 'c00001',
  price: 10000,
  state: 'ON_SALE',
  deliveryType: 'FREE',
  deliveryPrice: 0,
  mainImage: '',
  detailPage: '',
  totalQuantity: 100,
  createDate: new Date('2024-01-10'),
  updateDate: new Date('2024-01-10'),
  informationDisclosure: { key: '', id: '', name: '', fields: {} },
  ownerId: 'owner-1',
  ...overrides,
});

const { PRODUCTS } = vi.hoisted(() => ({ PRODUCTS: [] as Product[] }));
vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

PRODUCTS.push(
  makeProduct({ productId: 'smp000001', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000002', ownerId: 'owner-1', state: 'SOLD_OUT' }),
  makeProduct({ productId: 'smp000003', ownerId: 'owner-2', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000004', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000005', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000006', ownerId: 'owner-1', state: 'ON_SALE' }),
);

import { getMockProducts } from './getProducts';

const defaultSearch = { dateType: '', startDate: '', endDate: '', saleType: 'ALL', categoryId: 'ALL', searchValue: '' };

describe('getMockProducts', () => {
  it('ownerId가 일치하는 상품만 반환한다', () => {
    const result = getMockProducts('owner-1', defaultSearch, 1, 10);
    expect(result.products).toHaveLength(5);
    expect(result.products.find((p) => p.productId === 'smp000003')).toBeUndefined();
  });

  it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
    const result = getMockProducts('owner-999', defaultSearch, 1, 10);
    expect(result.products).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('ownerId 필터와 판매상태 필터를 함께 적용한다', () => {
    const result = getMockProducts('owner-1', { ...defaultSearch, saleType: 'SOLD_OUT' }, 1, 10);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].productId).toBe('smp000002');
  });

  describe('페이지네이션', () => {
    it('page 1, pageSize 2면 첫 두 상품을 반환한다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 1, 2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0].productId).toBe('smp000001');
      expect(result.products[1].productId).toBe('smp000002');
    });

    it('page 3, pageSize 2면 마지막 한 개를 반환한다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 3, 2);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productId).toBe('smp000006');
    });

    it('total은 페이지네이션 전 필터링된 전체 개수다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 1, 2);
      expect(result.total).toBe(5);
    });

    it('totalPages를 올바르게 계산한다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 1, 2);
      expect(result.totalPages).toBe(3);
    });

    it('결과가 0개면 totalPages가 1이다', () => {
      const result = getMockProducts('owner-999', defaultSearch, 1, 10);
      expect(result.totalPages).toBe(1);
    });

    it('응답에 page와 pageSize가 포함된다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 2, 3);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(3);
    });
  });
});
