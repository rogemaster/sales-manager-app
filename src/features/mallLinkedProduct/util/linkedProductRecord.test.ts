import { describe, it, expect } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { LinkedProductRow, splitSettingSnapshot, toMallLinkedProduct } from './linkedProductRecord';

const SETTING = {
  id: 'ss_003',
  ownerId: 'usr_001',
  mallAccountId: 'sa_002',
  mallCode: 'NSST',
  mallId: 'naver_store_002',
  nickname: '네이버 기본 설정',
  isActive: true,
  productCondition: 'NEW',
  salesPeriod: 60,
  deliveryCompany: 'CJ',
  shippingAddress: null,
  returnAddress: null,
  mallSettings: { purchaseReviewExposure: true },
  createdAt: new Date('2025-05-15T00:00:00.000Z'),
  updatedAt: new Date('2025-05-16T00:00:00.000Z'),
} as ShoppingSetting;

const PRODUCT = { productId: 'prod_1', name: '이어폰' } as Product;

const makeRow = (overrides: Partial<LinkedProductRow> = {}): LinkedProductRow => ({
  id: 'mlp_1',
  ownerId: 'usr_001',
  mallCode: 'NSST',
  mallAccountId: 'sa_002',
  mallId: 'naver_store_002',
  sourceProductId: 'prod_1',
  sourceShoppingSettingId: 'ss_003',
  status: 'success',
  externalProductId: '7',
  errorMessage: null,
  productSnapshot: PRODUCT,
  settingSnapshot: splitSettingSnapshot(SETTING),
  createdByEmail: 'a@b.c',
  updatedByEmail: null,
  createdAt: new Date('2026-09-22T00:00:00.000Z'),
  lastSentAt: new Date('2026-09-22T00:00:00.000Z'),
  updatedAt: new Date('2026-09-22T00:00:00.000Z'),
  ...overrides,
});

describe('splitSettingSnapshot', () => {
  it('top-level 컬럼과 겹치는 5개 필드를 뺀다', () => {
    const stored = splitSettingSnapshot(SETTING) as Record<string, unknown>;
    ['id', 'ownerId', 'mallCode', 'mallAccountId', 'mallId'].forEach((key) => expect(key in stored).toBe(false));
    expect(stored.nickname).toBe('네이버 기본 설정');
  });

  it('원본과 중첩 객체를 공유하지 않는다', () => {
    const stored = splitSettingSnapshot(SETTING);
    expect(stored.mallSettings).not.toBe(SETTING.mallSettings);
  });
});

describe('toMallLinkedProduct', () => {
  it('설정 스냅샷의 식별 필드를 컬럼 값으로 되살린다', () => {
    const linked = toMallLinkedProduct(makeRow());
    expect(linked.settingSnapshot).toMatchObject({
      id: 'ss_003',
      ownerId: 'usr_001',
      mallCode: 'NSST',
      mallAccountId: 'sa_002',
      mallId: 'naver_store_002',
      nickname: '네이버 기본 설정',
    });
  });

  it('스냅샷에 식별 필드가 섞여 있어도 컬럼 값이 이긴다', () => {
    const tampered = {
      ...splitSettingSnapshot(SETTING),
      mallAccountId: 'sa_999',
    } as LinkedProductRow['settingSnapshot'];
    const linked = toMallLinkedProduct(makeRow({ settingSnapshot: tampered }));
    expect(linked.settingSnapshot.mallAccountId).toBe('sa_002');
  });

  it('jsonb에서 문자열이 된 설정 시각을 Date로 되살린다', () => {
    const stored = {
      ...splitSettingSnapshot(SETTING),
      createdAt: '2025-05-15T00:00:00.000Z',
    } as unknown as LinkedProductRow['settingSnapshot'];
    const linked = toMallLinkedProduct(makeRow({ settingSnapshot: stored }));
    expect(linked.settingSnapshot.createdAt).toBeInstanceOf(Date);
  });

  it('null 컬럼은 optional 필드로 바꾼다', () => {
    const linked = toMallLinkedProduct(makeRow({ externalProductId: null, errorMessage: null, updatedByEmail: null }));
    expect(linked.externalProductId).toBeUndefined();
    expect(linked.errorMessage).toBeUndefined();
    expect(linked.updatedByEmail).toBeUndefined();
  });
});
