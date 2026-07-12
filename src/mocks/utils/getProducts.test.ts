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
);

import { getMockProducts } from './getProducts';

const defaultSearch = { dateType: '', startDate: '', endDate: '', saleType: 'ALL', categoryId: 'ALL', searchValue: '' };

describe('getMockProducts', () => {
  it('ownerId가 일치하는 상품만 반환한다', () => {
    const result = getMockProducts('owner-1', defaultSearch);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.productId === 'smp000003')).toBeUndefined();
  });

  it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
    const result = getMockProducts('owner-999', defaultSearch);
    expect(result).toHaveLength(0);
  });

  it('ownerId 필터와 판매상태 필터를 함께 적용한다', () => {
    const result = getMockProducts('owner-1', { ...defaultSearch, saleType: 'SOLD_OUT' });
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('smp000002');
  });
});
