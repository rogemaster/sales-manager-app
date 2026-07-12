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
  makeProduct({ productId: 'smp000004', ownerId: 'owner-2', state: 'ON_SALE' }),
);

import { getMockHomeStats, getMockRecentProducts } from './getHomeData';

describe('getMockHomeStats', () => {
  it('ownerId가 일치하는 상품만 집계한다', () => {
    const result = getMockHomeStats('owner-1');
    expect(result.total).toBe(2);
    expect(result.onSale).toBe(1);
    expect(result.soldOut).toBe(1);
  });

  it('다른 owner의 상품은 집계에서 제외한다', () => {
    const result = getMockHomeStats('owner-2');
    expect(result.total).toBe(2);
    expect(result.onSale).toBe(2);
  });
});

describe('getMockRecentProducts', () => {
  it('ownerId가 일치하는 상품만 반환한다', () => {
    const result = getMockRecentProducts('owner-1');
    expect(result).toHaveLength(2);
    expect(result.every((p) => ['smp000001', 'smp000002'].includes(p.productId))).toBe(true);
  });
});
