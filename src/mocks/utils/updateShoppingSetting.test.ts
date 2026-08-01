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
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { updateMockShoppingSetting } from './updateShoppingSetting';

describe('updateMockShoppingSetting', () => {
  it('지정한 id의 필드를 갱신한다', () => {
    const updated = updateMockShoppingSetting('ss_001', { nickname: '변경된 별칭', salesPeriod: 90 });
    expect(updated?.nickname).toBe('변경된 별칭');
    expect(updated?.salesPeriod).toBe(90);
  });

  it('updatedAt을 오늘 날짜로 갱신한다', () => {
    // 구현이 dayjs()(로컬 시간대) 기준으로 기록하므로 기댓값도 같은 기준으로 만든다.
    // new Date().toISOString()(UTC)을 쓰면 KST 00:00~09:00 구간에만 하루 어긋나 실패한다.
    const today = dayjs().format('YYYY-MM-DD');
    const updated = updateMockShoppingSetting('ss_001', { nickname: 'x' });
    expect(updated?.updatedAt).toBe(today);
  });

  it('존재하지 않는 id면 null을 반환한다', () => {
    expect(updateMockShoppingSetting('ss_999', { nickname: 'x' })).toBeNull();
  });
});
