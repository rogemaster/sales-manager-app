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
    {
      id: 'ss_002',
      mallAccountId: 'sa_002',
      mallCode: 'NSST',
      mallId: 'naver_store_002',
      nickname: '네이버',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-15',
      updatedAt: '2025-05-15',
    },
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { deleteMockShoppingSettings } from './deleteShoppingSettings';

describe('deleteMockShoppingSettings', () => {
  it('지정한 id를 목록에서 제거한다', () => {
    deleteMockShoppingSettings(['ss_001']);
    expect(SETTINGS.find((s) => s.id === 'ss_001')).toBeUndefined();
    expect(SETTINGS).toHaveLength(1);
  });

  it('존재하지 않는 id는 무시한다', () => {
    expect(() => deleteMockShoppingSettings(['ss_999'])).not.toThrow();
  });
});
