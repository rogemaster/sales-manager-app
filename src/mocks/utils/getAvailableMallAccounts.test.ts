import { describe, it, expect, vi } from 'vitest';
import type { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const makeAccount = (overrides: Partial<ShoppingAccount>): ShoppingAccount => ({
  id: 'sa_001',
  ownerId: 'usr_001',
  mallCode: 'COUP',
  mallId: 'coupang_seller_001',
  isActive: true,
  nickname: '',
  managerMd: '',
  phone: '',
  email: '',
  domain: '',
  category: '',
  createdAt: new Date('2025-01-01T00:00:00+09:00'),
  updatedAt: new Date('2025-01-01T00:00:00+09:00'),
  ...overrides,
});

const { SETTINGS } = vi.hoisted(() => ({ SETTINGS: [] as ShoppingSetting[] }));

vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

SETTINGS.push(
  {
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡1',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 30,
    shippingAddress: null,
    returnAddress: null,
    ownerId: 'usr_001',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01',
  },
  {
    id: 'ss_002',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡2',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 30,
    shippingAddress: null,
    returnAddress: null,
    ownerId: 'usr_001',
    createdAt: '2025-05-02',
    updatedAt: '2025-05-02',
  },
);

import { getMockAvailableMallAccounts } from './getAvailableMallAccounts';

describe('getMockAvailableMallAccounts', () => {
  it('넘겨받은 계정을 그대로 옵션으로 만든다', () => {
    const result = getMockAvailableMallAccounts([
      makeAccount({ id: 'sa_001' }),
      makeAccount({ id: 'sa_002', mallCode: 'NSST', mallId: 'naver_store_002' }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'sa_002', mallCode: 'NSST', mallId: 'naver_store_002' });
  });

  it('설정 건수를 정확히 집계한다', () => {
    const result = getMockAvailableMallAccounts([
      makeAccount({ id: 'sa_001' }),
      makeAccount({ id: 'sa_002', mallCode: 'NSST', mallId: 'naver_store_002' }),
    ]);

    expect(result.find((a) => a.id === 'sa_001')?.settingCount).toBe(2);
    expect(result.find((a) => a.id === 'sa_002')?.settingCount).toBe(0);
  });

  it('계정이 없으면 빈 배열이다', () => {
    expect(getMockAvailableMallAccounts([])).toEqual([]);
  });
});
