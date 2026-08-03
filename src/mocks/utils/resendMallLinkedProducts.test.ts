import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MallLinkedProduct, MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const OWNER_ID = 'usr_001';
const ORIGINAL_TIME = '2026-08-01T00:00:00.000Z';

type LinkedOverrides = {
  status?: MallLinkStatus;
  externalProductId?: string;
  mallCode?: string;
  sourceProductId?: string;
  ownerId?: string;
};

const { LINKED, resetMocks, makeLinked } = vi.hoisted(() => {
  const makeLinked = (id: string, overrides?: LinkedOverrides): MallLinkedProduct =>
    ({
      id,
      ownerId: overrides?.ownerId ?? 'usr_001',
      sourceProductId: overrides?.sourceProductId ?? 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: overrides?.mallCode ?? 'NSST',
      status: overrides?.status ?? 'success',
      externalProductId: overrides?.externalProductId,
      productSnapshot: { productId: 'p_001', name: '상품-p_001', price: 10000 },
      settingSnapshot: { id: 'ss_001', mallCode: overrides?.mallCode ?? 'NSST', nickname: '설정-ss_001' },
      createdByEmail: 'seller@shop.com',
      updatedByEmail: undefined,
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
  };

  return { LINKED, resetMocks, makeLinked };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { resendMockMallLinkedProducts } from './resendMallLinkedProducts';

// 성공/실패는 Math.random()으로 판정한다. 성공 경로는 externalProductId 생성에도 난수를 쓰므로
// mockReturnValueOnce 체인을 쓰면 호출 횟수에 따라 결과가 어긋난다. 항상 mockReturnValue로 고정한다.
const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);

describe('resendMockMallLinkedProducts', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('성공 시 기존 외부 상품코드를 유지하고 전송 시각을 갱신한다', () => {
    LINKED.push(makeLinked('mlp_001', { status: 'failed', externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.9);

    const result = resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
    expect(LINKED[0].status).toBe('success');
    expect(LINKED[0].errorMessage).toBeUndefined();
    expect(LINKED[0].lastSentAt).not.toBe(ORIGINAL_TIME);
  });

  it('실패해도 외부 상품코드를 지우지 않는다 — 외부몰 상품은 이전 값으로 살아있다', () => {
    LINKED.push(makeLinked('mlp_001', { status: 'success', externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.05);

    const result = resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
    expect(LINKED[0].status).toBe('failed');
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
    expect(LINKED[0].errorMessage).toBe('카테고리 매핑 오류');
  });

  it('수정 필드(updatedAt·updatedByEmail)를 건드리지 않는다', () => {
    LINKED.push(makeLinked('mlp_001', { externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.9);

    resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(LINKED[0].updatedAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].updatedByEmail).toBeUndefined();
  });

  it('스냅샷을 건드리지 않는다', () => {
    LINKED.push(makeLinked('mlp_001', { externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.9);

    resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(LINKED[0].productSnapshot.name).toBe('상품-p_001');
    expect(LINKED[0].settingSnapshot.nickname).toBe('설정-ss_001');
  });

  it('외부 상품코드가 있으면 같은 상품·몰에 다른 성공 이력이 있어도 중복 사유로 실패하지 않는다', () => {
    LINKED.push(
      makeLinked('mlp_001', { status: 'success', externalProductId: 'ext_NSST_other' }),
      makeLinked('mlp_002', { status: 'failed', externalProductId: 'ext_NSST_mine' }),
    );
    stubRandom(0.05);

    resendMockMallLinkedProducts(['mlp_002'], OWNER_ID);

    expect(LINKED[1].errorMessage).toBe('카테고리 매핑 오류');
  });

  it('외부 상품코드가 없는 건은 기존대로 중복 판정을 받는다', () => {
    LINKED.push(
      makeLinked('mlp_001', { status: 'success', externalProductId: 'ext_NSST_other' }),
      makeLinked('mlp_002', { status: 'failed', externalProductId: undefined }),
    );
    stubRandom(0.05);

    resendMockMallLinkedProducts(['mlp_002'], OWNER_ID);

    expect(LINKED[1].errorMessage).toBe('동일 상품이 이미 등록되어 있습니다');
  });

  it('외부 상품코드가 없던 건이 성공하면 새로 발급한다', () => {
    LINKED.push(makeLinked('mlp_001', { status: 'failed', externalProductId: undefined }));
    stubRandom(0.9);

    resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(LINKED[0].externalProductId).toMatch(/^ext_NSST_/);
  });

  it('여러 건을 처리하고 집계 결과를 반환한다', () => {
    LINKED.push(
      makeLinked('mlp_001', { externalProductId: 'ext_NSST_a' }),
      makeLinked('mlp_002', { externalProductId: 'ext_NSST_b' }),
      makeLinked('mlp_003', { externalProductId: 'ext_NSST_c' }),
    );
    stubRandom(0.9);

    const result = resendMockMallLinkedProducts(['mlp_001', 'mlp_002', 'mlp_003'], OWNER_ID);

    expect(result).toEqual({ totalCount: 3, successCount: 3, failCount: 0 });
  });

  it('다른 소유자의 id는 건너뛰고 집계에도 넣지 않는다', () => {
    LINKED.push(makeLinked('mlp_001', { ownerId: 'usr_999', externalProductId: 'ext_NSST_a' }));
    stubRandom(0.9);

    const result = resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(result).toEqual({ totalCount: 0, successCount: 0, failCount: 0 });
    expect(LINKED[0].lastSentAt).toBe(ORIGINAL_TIME);
  });
});
