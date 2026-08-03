import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const { LINKED, resetMocks, OWNER_ID } = vi.hoisted(() => {
  const OWNER_ID = 'usr_001';
  const OTHER_OWNER_ID = 'usr_999';

  const makeLinked = (id: string, ownerId: string): MallLinkedProduct =>
    ({
      id,
      ownerId,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: `ext_NSST_${id}`,
      productSnapshot: { productId: 'p_001', name: '상품-p_001', price: 10000 },
      settingSnapshot: { id: 'ss_001', mallCode: 'NSST', nickname: '설정-ss_001' },
      createdByEmail: 'seller@shop.com',
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
  };

  resetMocks();

  return { LINKED, resetMocks, OWNER_ID };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { getMockMallLinkedProduct } from './getMallLinkedProduct';

describe('getMockMallLinkedProduct', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('소유자의 연동 데이터를 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_001', OWNER_ID)?.id).toBe('mlp_001');
  });

  it('다른 소유자의 데이터는 null을 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_002', OWNER_ID)).toBeNull();
  });

  it('없는 id는 null을 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_999', OWNER_ID)).toBeNull();
  });

  it('ownerId가 없으면 null을 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_001', null)).toBeNull();
  });
});
