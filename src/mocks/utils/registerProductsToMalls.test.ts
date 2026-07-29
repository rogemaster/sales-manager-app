import { describe, it, expect, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const { PRODUCTS } = vi.hoisted(() => {
  const makeProduct = (overrides: Partial<Product>): Product =>
    ({
      productId: 'p_001',
      name: '상품A',
      categoryId: 'c00001',
      price: 10000,
      state: 'ON_SALE',
      deliveryType: 'FREE',
      deliveryPrice: 0,
      mainImage: '',
      detailPage: '',
      totalQuantity: 10,
      createDate: new Date('2025-01-01'),
      updateDate: new Date('2025-01-01'),
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      ownerId: 'usr_001',
      ...overrides,
    }) as Product;

  return {
    PRODUCTS: [makeProduct({ productId: 'p_001' }), makeProduct({ productId: 'p_002' })],
  };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

import { registerMockProductsToMalls } from './registerProductsToMalls';

describe('registerMockProductsToMalls', () => {
  it('해당 상품의 registeredMalls에 항목을 추가하고 처리 건수를 반환한다', () => {
    const count = registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_003' }]);
    expect(count).toBe(1);
    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({ mallCode: 'NSST', shoppingSettingId: 'ss_003' });
  });

  it('같은 상품에 같은 몰-설정 조합을 여러 번 등록해도 각각 별도 이력으로 누적된다', () => {
    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    expect(PRODUCTS[1].registeredMalls).toHaveLength(2);
  });

  it('존재하지 않는 productId는 건너뛰고 건수에 포함하지 않는다', () => {
    const count = registerMockProductsToMalls([{ productId: 'nope', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    expect(count).toBe(0);
  });
});
