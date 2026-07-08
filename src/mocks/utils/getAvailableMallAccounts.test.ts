import { describe, it, expect, vi } from 'vitest';
import type { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const makeAccount = (overrides: Partial<ShoppingAccount>): ShoppingAccount => ({
  id: 'sa_001',
  ownerId: 'usr_001',
  mallCode: 'COUP',
  mallId: 'coupang_seller_001',
  password: 'pass',
  isActive: true,
  nickname: '',
  managerMd: '',
  phone: '',
  email: '',
  domain: '',
  category: '',
  apiKey: '',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  ...overrides,
});

const { ACCOUNTS, SETTINGS } = vi.hoisted(() => ({
  ACCOUNTS: [] as ShoppingAccount[],
  SETTINGS: [] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingAccountsData', () => ({ MOCK_SHOPPING_ACCOUNTS_DATA: ACCOUNTS }));
vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

ACCOUNTS.push(
  makeAccount({ id: 'sa_001', ownerId: 'usr_001', mallCode: 'COUP', mallId: 'coupang_seller_001' }),
  makeAccount({ id: 'sa_002', ownerId: 'usr_001', mallCode: 'NSST', mallId: 'naver_store_002' }),
  makeAccount({ id: 'sa_006', ownerId: 'usr_005', mallCode: 'COUP', mallId: 'coupang_seller_006' }),
);
SETTINGS.push(
  { id: 'ss_001', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡1', isActive: true, ownerId: 'usr_001', createdAt: '2025-05-01', updatedAt: '2025-05-01' },
  { id: 'ss_002', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡2', isActive: true, ownerId: 'usr_001', createdAt: '2025-05-02', updatedAt: '2025-05-02' },
);

import { getMockAvailableMallAccounts } from './getAvailableMallAccounts';

describe('getMockAvailableMallAccounts', () => {
  it('ownerId가 일치하는 계정만 반환한다', () => {
    const result = getMockAvailableMallAccounts('usr_001');
    expect(result).toHaveLength(2);
  });

  it('설정 건수를 정확히 집계한다', () => {
    const result = getMockAvailableMallAccounts('usr_001');
    expect(result.find((a) => a.id === 'sa_001')?.settingCount).toBe(2);
    expect(result.find((a) => a.id === 'sa_002')?.settingCount).toBe(0);
  });

  it('다른 owner의 계정은 제외한다', () => {
    const result = getMockAvailableMallAccounts('usr_001');
    expect(result.find((a) => a.id === 'sa_006')).toBeUndefined();
  });
});
