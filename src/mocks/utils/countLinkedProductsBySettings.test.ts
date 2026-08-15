import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

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
      makeLinked({ id: 'mlp_001', sourceShoppingSettingId: 'ss_001' }),
      // 같은 설정으로 두 번 전송된 건 — 연동 1건 = 외부몰 상품 1개라 중복 연동이 허용된다.
      makeLinked({ id: 'mlp_002', sourceShoppingSettingId: 'ss_001' }),
      makeLinked({ id: 'mlp_003', sourceShoppingSettingId: 'ss_002', mallCode: 'KAKAOS' }),
      // 다른 계정이 같은 설정 id를 쓰는 상황 — ownerId로 걸러져야 한다.
      makeLinked({ id: 'mlp_004', ownerId: 'usr_999', sourceShoppingSettingId: 'ss_001' }),
    );
  };

  resetLinked();

  return { LINKED, resetLinked };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { countMockLinkedProductsBySettings } from './countLinkedProductsBySettings';

describe('countMockLinkedProductsBySettings', () => {
  beforeEach(() => {
    resetLinked();
  });

  it('지정한 설정에서 파생된 연동 데이터 건수를 반환한다', () => {
    expect(countMockLinkedProductsBySettings('usr_001', ['ss_001'])).toBe(2);
  });

  it('여러 설정을 넘기면 건수를 합산한다', () => {
    expect(countMockLinkedProductsBySettings('usr_001', ['ss_001', 'ss_002'])).toBe(3);
  });

  it('다른 계정의 연동 데이터는 세지 않는다', () => {
    expect(countMockLinkedProductsBySettings('usr_999', ['ss_001'])).toBe(1);
  });

  it('연동 데이터가 없는 설정이면 0을 반환한다', () => {
    expect(countMockLinkedProductsBySettings('usr_001', ['ss_404'])).toBe(0);
  });

  it('빈 배열을 넘기면 0을 반환한다', () => {
    expect(countMockLinkedProductsBySettings('usr_001', [])).toBe(0);
  });

  it('같은 설정 id가 중복으로 들어와도 한 번만 센다', () => {
    expect(countMockLinkedProductsBySettings('usr_001', ['ss_001', 'ss_001'])).toBe(2);
  });
});
