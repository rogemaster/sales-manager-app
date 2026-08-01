import { describe, it, expect, vi } from 'vitest';
import type { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const { PRODUCTS, SETTINGS } = vi.hoisted(() => {
  const PRODUCTS = [
    { productId: 'p1', ownerId: 'own_1' },
    { productId: 'p2', ownerId: 'own_1' },
    { productId: 'p3', ownerId: 'own_2' },
  ];
  const SETTINGS = [
    { id: 's1', ownerId: 'own_1' },
    { id: 's2', ownerId: 'own_2' },
  ];
  return { PRODUCTS, SETTINGS };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));
vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

import { isOwnerMatch, allOwnedBy, areProductsOwnedBy, areMallLinkRequestsOwnedBy } from './verifyOwnership';

describe('isOwnerMatch', () => {
  it('resourceOwnerId와 requestOwnerId가 같으면 true를 반환한다', () => {
    expect(isOwnerMatch('usr_001', 'usr_001')).toBe(true);
  });

  it('resourceOwnerId와 requestOwnerId가 다르면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', 'usr_002')).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', null)).toBe(false);
  });

  it('requestOwnerId가 빈 문자열이면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', '')).toBe(false);
  });
});

describe('allOwnedBy', () => {
  const data = [
    { id: 'a1', ownerId: 'own_1' },
    { id: 'a2', ownerId: 'own_1' },
    { id: 'a3', ownerId: 'own_2' },
  ];

  it('모든 id가 requestOwnerId 소유면 true를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a2'], 'own_1', data)).toBe(true);
  });

  it('하나라도 다른 ownerId 소유면 false를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a3'], 'own_1', data)).toBe(false);
  });

  it('존재하지 않는 id가 포함되면 false를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a99'], 'own_1', data)).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(allOwnedBy(['a1'], null, data)).toBe(false);
  });

  it('빈 ids 배열이면 true를 반환한다', () => {
    expect(allOwnedBy([], 'own_1', data)).toBe(true);
  });
});

describe('areProductsOwnedBy', () => {
  it('모든 productId가 requestOwnerId 소유면 true를 반환한다', () => {
    expect(areProductsOwnedBy(['p1', 'p2'], 'own_1')).toBe(true);
  });

  it('하나라도 다른 ownerId 소유면 false를 반환한다', () => {
    expect(areProductsOwnedBy(['p1', 'p3'], 'own_1')).toBe(false);
  });

  it('존재하지 않는 productId가 포함되면 false를 반환한다', () => {
    expect(areProductsOwnedBy(['p1', 'nope'], 'own_1')).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(areProductsOwnedBy(['p1'], null)).toBe(false);
  });

  it('빈 productIds 배열이면 true를 반환한다', () => {
    expect(areProductsOwnedBy([], 'own_1')).toBe(true);
  });
});

describe('areMallLinkRequestsOwnedBy', () => {
  const item = (productId: string, shoppingSettingId: string): MallLinkedProductRequestItem => ({
    productId,
    mallCode: 'NSST',
    shoppingSettingId,
  });

  it('상품·설정 모두 소유 시 true를 반환한다', () => {
    expect(areMallLinkRequestsOwnedBy([item('p1', 's1')], 'own_1')).toBe(true);
  });

  it('설정이 남의 것이면 false를 반환한다', () => {
    expect(areMallLinkRequestsOwnedBy([item('p1', 's2')], 'own_1')).toBe(false);
  });

  it('상품이 남의 것이면 false를 반환한다', () => {
    expect(areMallLinkRequestsOwnedBy([item('p3', 's1')], 'own_1')).toBe(false);
  });

  it('존재하지 않는 설정 id면 false를 반환한다', () => {
    expect(areMallLinkRequestsOwnedBy([item('p1', 'nope')], 'own_1')).toBe(false);
  });
});
