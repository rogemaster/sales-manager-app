import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => {
  const makeSetting = (overrides: Partial<ShoppingSetting>): ShoppingSetting =>
    ({
      id: 'ss_001',
      mallAccountId: 'sa_001',
      mallCode: 'COUP',
      mallId: 'coupang_seller_001',
      nickname: '기본 설정',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
      ...overrides,
    }) as ShoppingSetting;

  return {
    SETTINGS: [
      makeSetting({ id: 'ss_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 메인' }),
      makeSetting({ id: 'ss_002', mallCode: 'NSST', mallId: 'coupang_seller_001', nickname: '네이버 기본' }),
      makeSetting({ id: 'ss_003', mallCode: 'GMK', mallId: 'coupang_seller_001', nickname: '지마켓 비활성', isActive: false }),
      makeSetting({ id: 'ss_004', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '다른 사용자', ownerId: 'usr_005' }),
    ],
  };
});

vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

import { getMockActiveShoppingSettings } from './getActiveShoppingSettings';

describe('getMockActiveShoppingSettings', () => {
  it('ownerId가 일치하는 활성 설정만 반환한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result.map((r) => r.id)).toEqual(['ss_001', 'ss_002']);
  });

  it('isActive가 false인 설정은 제외한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result.find((r) => r.id === 'ss_003')).toBeUndefined();
  });

  it('다른 owner의 설정은 제외한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result.find((r) => r.id === 'ss_004')).toBeUndefined();
  });

  it('필요한 필드만 매핑해 반환한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result[0]).toEqual({ id: 'ss_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 메인' });
  });
});
