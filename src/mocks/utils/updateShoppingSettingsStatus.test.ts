import { describe, it, expect, vi } from 'vitest';
import dayjs from 'dayjs';
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

import { updateMockShoppingSettingsStatus } from './updateShoppingSettingsStatus';

describe('updateMockShoppingSettingsStatus', () => {
  it('지정한 id들의 isActive를 변경한다', () => {
    updateMockShoppingSettingsStatus(['ss_001'], false);
    expect(SETTINGS.find((s) => s.id === 'ss_001')?.isActive).toBe(false);
  });

  it('updatedAt을 오늘 날짜로 갱신한다', () => {
    // 구현이 dayjs()(로컬 시간대) 기준으로 기록하므로 기댓값도 같은 기준으로 만든다.
    // new Date().toISOString()(UTC)을 쓰면 KST 00:00~09:00 구간에만 하루 어긋나 실패한다.
    const today = dayjs().format('YYYY-MM-DD');
    updateMockShoppingSettingsStatus(['ss_002'], false);
    expect(SETTINGS.find((s) => s.id === 'ss_002')?.updatedAt).toBe(today);
  });

  it('존재하지 않는 id는 무시한다', () => {
    expect(() => updateMockShoppingSettingsStatus(['ss_999'], true)).not.toThrow();
  });
});
