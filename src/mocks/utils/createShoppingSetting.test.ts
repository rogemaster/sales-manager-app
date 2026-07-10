import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => ({
  SETTINGS: [] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { createMockShoppingSetting } from './createShoppingSetting';
import type { CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

const body: CreateShoppingSettingBody = {
  mallAccountId: 'sa_001',
  mallCode: 'COUP',
  mallId: 'coupang_seller_001',
  nickname: '신규 설정',
  isActive: true,
  productCondition: 'NEW',
  salesPeriod: 7,
  shippingAddress: null,
  returnAddress: null,
};

describe('createMockShoppingSetting', () => {
  it('새 설정을 생성해 배열에 추가한다', () => {
    const created = createMockShoppingSetting(body, 'usr_001');
    expect(created.nickname).toBe('신규 설정');
    expect(created.ownerId).toBe('usr_001');
    expect(SETTINGS).toHaveLength(1);
  });

  it('id, createdAt, updatedAt을 자동 생성한다', () => {
    const created = createMockShoppingSetting(body, 'usr_001');
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });
});
