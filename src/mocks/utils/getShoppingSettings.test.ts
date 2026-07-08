import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting, ShoppingSettingSearchType } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => {
  const makeSetting = (overrides: Partial<ShoppingSetting>): ShoppingSetting => ({
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '기본 설정',
    isActive: true,
    ownerId: 'usr_001',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01',
    ...overrides,
  });

  return {
    SETTINGS: [
      makeSetting({ id: 'ss_001', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 메인', createdAt: '2025-05-01', updatedAt: '2025-05-01' }),
      makeSetting({ id: 'ss_002', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 프로모션', createdAt: '2025-05-10', updatedAt: '2025-05-12' }),
      makeSetting({ id: 'ss_003', mallAccountId: 'sa_002', mallCode: 'NSST', mallId: 'naver_store_002', nickname: '네이버 기본', createdAt: '2025-05-15', updatedAt: '2025-05-15' }),
      makeSetting({ id: 'ss_004', mallAccountId: 'sa_006', mallCode: 'COUP', mallId: 'coupang_seller_006', nickname: '쿠팡 B', ownerId: 'usr_005', createdAt: '2025-05-25', updatedAt: '2025-05-25' }),
    ],
  };
});

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { getMockShoppingSettings } from './getShoppingSettings';

const defaultFilters: ShoppingSettingSearchType = {
  dateType: 'createdAt',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  mallCode: 'ALL',
  mallAccountId: 'ALL',
  searchValue: '',
};

describe('getMockShoppingSettings', () => {
  it('ownerId가 일치하는 설정만 반환한다', () => {
    const result = getMockShoppingSettings('usr_001', defaultFilters, 1, 10);
    expect(result.total).toBe(3);
    result.settings.forEach((s) => expect(s.ownerId).toBe('usr_001'));
  });

  it("mallCode 'COUP'만 필터링하면 2건을 반환한다", () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, mallCode: 'COUP' }, 1, 10);
    expect(result.total).toBe(2);
  });

  it('mallAccountId로 필터링하면 해당 계정 설정만 반환한다', () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, mallAccountId: 'sa_002' }, 1, 10);
    expect(result.total).toBe(1);
    expect(result.settings[0].id).toBe('ss_003');
  });

  it('searchValue가 별칭에 포함되면 매칭된다', () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, searchValue: '프로모션' }, 1, 10);
    expect(result.total).toBe(1);
    expect(result.settings[0].id).toBe('ss_002');
  });

  it('날짜 범위 밖이면 제외된다', () => {
    const result = getMockShoppingSettings(
      'usr_001',
      { ...defaultFilters, startDate: '2025-05-11', endDate: '2025-05-31' },
      1,
      10,
    );
    expect(result.total).toBe(1);
    expect(result.settings[0].id).toBe('ss_003');
  });

  it('결과가 0개면 totalPages가 1이다', () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, mallAccountId: 'sa_999' }, 1, 10);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});
