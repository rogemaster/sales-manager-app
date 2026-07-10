import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => ({
  SETTINGS: [
    {
      id: 'ss_001',
      mallAccountId: 'sa_001',
      mallCode: 'COUP',
      mallId: 'coupang_seller_001',
      nickname: '쿠팡 메인',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
    },
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { getMockShoppingSetting } from './getShoppingSetting';

describe('getMockShoppingSetting', () => {
  it('id가 일치하는 설정을 반환한다', () => {
    expect(getMockShoppingSetting('ss_001')?.nickname).toBe('쿠팡 메인');
  });

  it('일치하는 id가 없으면 undefined를 반환한다', () => {
    expect(getMockShoppingSetting('ss_999')).toBeUndefined();
  });
});
