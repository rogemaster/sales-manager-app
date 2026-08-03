import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type {
  MallLinkedProduct,
  UpdateMallLinkedProductBody,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const EDITOR_EMAIL = 'editor@shop.com';
const ORIGINAL_TIME = '2026-08-01T00:00:00.000Z';

// vi.hoisted 콜백은 모듈 스코프 const 선언보다 먼저 실행된다.
// 콜백 안에서 바깥 상수를 참조하면 TDZ ReferenceError가 나므로, 콜백이 쓰는 상수는 안에서 선언하고
// 바깥에서도 필요한 것만 반환받는다.
const { LINKED, resetMocks, OWNER_ID } = vi.hoisted(() => {
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
      productSnapshot: { productId: 'p_001', name: '원본 상품명', price: 10000 },
      settingSnapshot: { id: 'ss_001', mallCode: 'NSST', nickname: '원본 설정명' },
      createdByEmail: 'seller@shop.com',
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
  };

  resetMocks();

  return { LINKED, resetMocks, OWNER_ID };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { updateMockMallLinkedProduct } from './updateMallLinkedProduct';

const makeBody = (overrides?: {
  productName?: string;
  nickname?: string;
  settingMallCode?: string;
}): UpdateMallLinkedProductBody => ({
  updatedByEmail: EDITOR_EMAIL,
  productSnapshot: {
    productId: 'p_001',
    name: overrides?.productName ?? '수정된 상품명',
    price: 20000,
    informationDisclosure: { key: '', id: '', name: '고시정보', fields: {} },
  } as unknown as Product,
  settingSnapshot: {
    id: 'ss_001',
    mallCode: overrides?.settingMallCode ?? 'NSST',
    nickname: overrides?.nickname ?? '수정된 설정명',
  } as unknown as ShoppingSetting,
});

describe('updateMockMallLinkedProduct', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('상품·설정 스냅샷을 새 값으로 교체한다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect(LINKED[0].productSnapshot.price).toBe(20000);
    expect(LINKED[0].settingSnapshot.nickname).toBe('수정된 설정명');
  });

  it('수정 시각과 수정자를 기록한다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].updatedByEmail).toBe(EDITOR_EMAIL);
    expect(LINKED[0].updatedAt).not.toBe(ORIGINAL_TIME);
  });

  it('전송 관련 필드(status·lastSentAt·externalProductId)를 건드리지 않는다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].status).toBe('success');
    expect(LINKED[0].lastSentAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
  });

  it('불변 식별 정보와 생성 정보를 건드리지 않는다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].sourceProductId).toBe('p_001');
    expect(LINKED[0].sourceShoppingSettingId).toBe('ss_001');
    expect(LINKED[0].createdAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].createdByEmail).toBe('seller@shop.com');
  });

  it('스냅샷을 깊은 복사로 저장한다 — 저장 후 호출자가 본문을 바꿔도 영향받지 않는다', () => {
    const body = makeBody();
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, body);

    body.productSnapshot.name = '나중에 바꾼 이름';
    body.productSnapshot.informationDisclosure.name = '나중에 바꾼 고시정보';

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect(LINKED[0].productSnapshot.informationDisclosure.name).toBe('고시정보');
  });

  it('설정 스냅샷에 다른 몰 코드가 실려 와도 레코드의 mallCode로 고정한다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody({ settingMallCode: 'KAKAOS' }));

    expect(LINKED[0].mallCode).toBe('NSST');
    expect(LINKED[0].settingSnapshot.mallCode).toBe('NSST');
  });

  it('다른 소유자의 데이터는 수정하지 않고 null을 반환한다', () => {
    const result = updateMockMallLinkedProduct('mlp_002', OWNER_ID, makeBody());

    expect(result).toBeNull();
    expect(LINKED[1].productSnapshot.name).toBe('원본 상품명');
    expect(LINKED[1].updatedByEmail).toBeUndefined();
  });

  it('없는 id면 null을 반환한다', () => {
    expect(updateMockMallLinkedProduct('mlp_999', OWNER_ID, makeBody())).toBeNull();
  });
});
