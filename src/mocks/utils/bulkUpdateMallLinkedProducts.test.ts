import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const EDITOR_EMAIL = 'editor@shop.com';
const ORIGINAL_TIME = '2026-08-01T00:00:00.000Z';

// vi.hoisted 콜백은 모듈 스코프 const 선언보다 먼저 실행된다.
// 콜백 안에서 바깥 상수를 참조하면 TDZ ReferenceError가 나므로, 콜백이 쓰는 상수는 안에서 선언한다.
const { LINKED, SETTINGS, resetMocks, OWNER_ID } = vi.hoisted(() => {
  const OWNER_ID = 'usr_001';
  const OTHER_OWNER_ID = 'usr_999';

  const makeLinked = (id: string, ownerId: string): MallLinkedProduct =>
    ({
      id,
      ownerId,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: 'ext_NSST_keep1',
      productSnapshot: {
        productId: 'p_001',
        name: '원본 상품명',
        price: 10000,
        brand: '원본 브랜드',
        informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: '원본제조사' } },
      },
      settingSnapshot: {
        id: 'ss_001',
        ownerId,
        mallAccountId: 'sa_001',
        mallId: 'naver_seller_01',
        mallCode: 'NSST',
        nickname: '원본 설정명',
        shippingAddress: { code: 'addr_a', name: '원본 출고지', zipCode: '00000', address: 'A', addressDetail: '' },
      },
      createdByEmail: 'seller@shop.com',
      // vi.hoisted 콜백은 바깥 const 선언보다 먼저 실행되므로 ORIGINAL_TIME을 참조하지 않고 리터럴을 쓴다
      // (동일 값은 파일 상단 ORIGINAL_TIME으로도 유지해 아래 assertion에서 재사용한다).
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const makeSetting = (id: string, mallAccountId: string, nickname: string): ShoppingSetting =>
    ({
      id,
      ownerId: OWNER_ID,
      mallAccountId,
      mallId: mallAccountId === 'sa_001' ? 'naver_seller_01' : 'naver_seller_02',
      mallCode: 'NSST',
      nickname,
      isActive: true,
      shippingAddress: { code: 'addr_b', name: '새 출고지', zipCode: '11111', address: 'B', addressDetail: '' },
      returnAddress: null,
    }) as unknown as ShoppingSetting;

  const LINKED: MallLinkedProduct[] = [];
  const SETTINGS: ShoppingSetting[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
    SETTINGS.length = 0;
    SETTINGS.push(makeSetting('ss_002', 'sa_001', '같은 계정 설정'), makeSetting('ss_003', 'sa_999', '다른 계정 설정'));
  };

  resetMocks();

  return { LINKED, SETTINGS, resetMocks, OWNER_ID };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { bulkUpdateMockMallLinkedProducts } from './bulkUpdateMallLinkedProducts';

const baseBody = { ownerId: OWNER_ID, ids: ['mlp_001'], updatedByEmail: EDITOR_EMAIL };

describe('bulkUpdateMockMallLinkedProducts — 상품 patch', () => {
  beforeEach(() => resetMocks());

  it('보낸 키만 덮고 나머지 키는 유지한다', () => {
    bulkUpdateMockMallLinkedProducts(
      { ...baseBody, productSnapshot: { name: '수정된 상품명' } as Partial<Product> },
      SETTINGS,
    );

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect(LINKED[0].productSnapshot.price).toBe(10000);
    expect(LINKED[0].productSnapshot.brand).toBe('원본 브랜드');
  });

  it('수정 시각과 수정자를 갱신한다', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: { name: 'x' } as Partial<Product> }, SETTINGS);

    expect(LINKED[0].updatedByEmail).toBe(EDITOR_EMAIL);
    expect(LINKED[0].updatedAt).not.toBe(ORIGINAL_TIME);
  });

  it('전송 관련 필드(status·lastSentAt·externalProductId)를 건드리지 않는다', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: { name: 'x' } as Partial<Product> }, SETTINGS);

    expect(LINKED[0].status).toBe('success');
    expect(LINKED[0].lastSentAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
  });

  it('요청 본문과 스냅샷이 객체를 공유하지 않는다 (깊은 복사)', () => {
    const patch = {
      informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: '새제조사' } },
    } as unknown as Partial<Product>;

    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: patch }, SETTINGS);
    LINKED[0].productSnapshot.informationDisclosure.fields.제조자 = '변조';

    expect((patch.informationDisclosure as { fields: Record<string, string> }).fields.제조자).toBe('새제조사');
  });

  it('타인 소유 건은 변경하지 않고 failCount에 센다', () => {
    const result = bulkUpdateMockMallLinkedProducts(
      {
        ...baseBody,
        ids: ['mlp_002'],
        productSnapshot: { name: 'x' } as Partial<Product>,
      },
      SETTINGS,
    );

    expect(LINKED[1].productSnapshot.name).toBe('원본 상품명');
    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
  });
});

describe('bulkUpdateMockMallLinkedProducts — 설정 교체', () => {
  beforeEach(() => resetMocks());

  it('settingSnapshot을 오리지널 설정 값으로 교체하고 sourceShoppingSettingId를 갱신한다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_002' }, SETTINGS);

    expect(LINKED[0].settingSnapshot.nickname).toBe('같은 계정 설정');
    expect(LINKED[0].settingSnapshot.shippingAddress?.code).toBe('addr_b');
    expect(LINKED[0].sourceShoppingSettingId).toBe('ss_002');
    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
  });

  it('오리지널 설정과 스냅샷이 객체를 공유하지 않는다 (깊은 복사)', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_002' }, SETTINGS);
    LINKED[0].settingSnapshot.shippingAddress!.name = '변조';

    expect(SETTINGS[0].shippingAddress?.name).toBe('새 출고지');
  });

  it('계정이 다른 설정은 적용하지 않고 failCount에 센다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_003' }, SETTINGS);

    expect(LINKED[0].settingSnapshot.nickname).toBe('원본 설정명');
    expect(LINKED[0].sourceShoppingSettingId).toBe('ss_001');
    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
  });

  it('없는 설정 id면 적용하지 않고 failCount에 센다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_없음' }, SETTINGS);

    expect(LINKED[0].settingSnapshot.nickname).toBe('원본 설정명');
    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
  });
});

describe('bulkUpdateMockMallLinkedProducts — 잘못된 요청', () => {
  beforeEach(() => resetMocks());

  it('productSnapshot과 shoppingSettingId가 둘 다 없으면 null을 반환한다', () => {
    expect(bulkUpdateMockMallLinkedProducts(baseBody, SETTINGS)).toBeNull();
  });
});

describe('bulkUpdateMockMallLinkedProducts — clearKeys', () => {
  beforeEach(() => resetMocks());

  it('clearKeys에 담긴 선택 필드는 스냅샷에서 지우고 나머지 키는 유지한다', () => {
    // 원본에 customerCode를 심어 둔다 — 체크만 하고 값을 비운 상태를 흉내낸다.
    LINKED[0].productSnapshot.customerCode = 'C-001';

    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, clearKeys: ['customerCode'] }, SETTINGS);

    expect('customerCode' in LINKED[0].productSnapshot).toBe(false);
    expect(LINKED[0].productSnapshot.name).toBe('원본 상품명');
    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
  });

  it('필수 그룹의 키는 clearKeys로 와도 지우지 않는다', () => {
    // 필수 값이 undefined가 되면 목록·수정 화면이 곧바로 깨진다 (price.toLocaleString() 등).
    bulkUpdateMockMallLinkedProducts({ ...baseBody, clearKeys: ['price', 'name'] }, SETTINGS);

    expect(LINKED[0].productSnapshot.price).toBe(10000);
    expect(LINKED[0].productSnapshot.name).toBe('원본 상품명');
  });

  it('productSnapshot·shoppingSettingId 없이 clearKeys만 와도 정상 요청이다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, clearKeys: ['customerCode'] }, SETTINGS);

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
  });

  it('patch와 clearKeys가 함께 오면 덮어쓰기와 지우기가 모두 적용된다', () => {
    LINKED[0].productSnapshot.customerCode = 'C-001';

    bulkUpdateMockMallLinkedProducts(
      {
        ...baseBody,
        productSnapshot: { name: '수정된 상품명' } as Partial<Product>,
        clearKeys: ['customerCode'],
      },
      SETTINGS,
    );

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect('customerCode' in LINKED[0].productSnapshot).toBe(false);
  });

  it('빈 clearKeys 배열만 오면 여전히 잘못된 요청이다', () => {
    expect(bulkUpdateMockMallLinkedProducts({ ...baseBody, clearKeys: [] }, SETTINGS)).toBeNull();
  });
});
