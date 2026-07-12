import { describe, it, expect, vi } from 'vitest';
import type { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';

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

const { ACCOUNTS } = vi.hoisted(() => ({ ACCOUNTS: [] as ShoppingAccount[] }));
vi.mock('../data/MockShoppingAccountsData', () => ({ MOCK_SHOPPING_ACCOUNTS_DATA: ACCOUNTS }));

ACCOUNTS.push(
  makeAccount({ id: 'sa_001', ownerId: 'usr_001', mallCode: 'COUP', mallId: 'coupang_seller_001', isActive: true }),
  makeAccount({ id: 'sa_002', ownerId: 'usr_001', mallCode: 'NSST', mallId: 'naver_store_002', isActive: true }),
  makeAccount({ id: 'sa_003', ownerId: 'usr_001', mallCode: 'COUP', mallId: 'coupang_seller_003', isActive: false }),
  makeAccount({ id: 'sa_004', ownerId: 'usr_005', mallCode: 'COUP', mallId: 'coupang_seller_004', isActive: true }),
);

import { getMockShoppingAccountsByMall } from './getShoppingAccountsByMall';

describe('getMockShoppingAccountsByMall', () => {
  it('ownerId와 mallCode가 모두 일치하는 활성 계정만 반환한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sa_001');
  });

  it('isActive가 false인 계정은 제외한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result.find((a) => a.id === 'sa_003')).toBeUndefined();
  });

  it('다른 owner의 계정은 제외한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result.find((a) => a.id === 'sa_004')).toBeUndefined();
  });

  it('mallCode가 일치하지 않으면 빈 배열을 반환한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'HALF');
    expect(result).toHaveLength(0);
  });

  it('응답 객체는 id/mallCode/mallId만 포함한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result[0]).toEqual({ id: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001' });
  });
});
