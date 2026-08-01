import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const OWNER_ID = 'usr_001';
const EMAIL = 'seller@shop.com';

const { PRODUCTS, SETTINGS, LINKED, resetMocks } = vi.hoisted(() => {
  const makeProduct = (productId: string): Product =>
    ({
      productId,
      name: `상품-${productId}`,
      categoryId: 'c00001',
      price: 10000,
      state: 'ON_SALE',
      deliveryType: 'FREE',
      deliveryPrice: 0,
      mainImage: '',
      detailPage: '',
      option: [],
      totalQuantity: 10,
      keyWords: [],
      createDate: new Date('2026-01-01'),
      updateDate: new Date('2026-01-01'),
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      ownerId: 'usr_001',
    }) as Product;

  const makeSetting = (id: string, mallCode: string): ShoppingSetting =>
    ({
      id,
      mallAccountId: 'sa_001',
      mallCode,
      mallId: 'seller_001',
      nickname: `설정-${id}`,
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }) as ShoppingSetting;

  const PRODUCTS: Product[] = [];
  const SETTINGS: ShoppingSetting[] = [];
  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    PRODUCTS.length = 0;
    PRODUCTS.push(makeProduct('p_001'), makeProduct('p_002'));

    SETTINGS.length = 0;
    SETTINGS.push(makeSetting('ss_001', 'NSST'), makeSetting('ss_002', 'KAKAOS'), makeSetting('ss_003', 'COUP'));

    LINKED.length = 0;
  };

  resetMocks();

  return { PRODUCTS, SETTINGS, LINKED, resetMocks };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));
vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));
vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { createMockMallLinkedProducts } from './createMallLinkedProducts';

// 성공/실패는 Math.random()으로 판정한다. 성공 경로는 externalProductId 생성에도 난수를 쓰므로
// mockReturnValueOnce 체인을 쓰면 호출 횟수에 따라 결과가 어긋난다. 항상 mockReturnValue로 고정한다.
const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);

describe('createMockMallLinkedProducts', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('연동 데이터를 생성하고 집계 결과를 반환한다', () => {
    stubRandom(0.9);

    const result = createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
    expect(LINKED).toHaveLength(1);
    expect(LINKED[0]).toMatchObject({
      ownerId: OWNER_ID,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      createdByEmail: EMAIL,
    });
    expect(LINKED[0].externalProductId).toMatch(/^ext_NSST_/);
    expect(LINKED[0].updatedByEmail).toBeUndefined();
  });

  it('생성 시각 3종이 모두 같은 값으로 기록된다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    const { createdAt, lastSentAt, updatedAt } = LINKED[0];
    expect(createdAt).toBe(lastSentAt);
    expect(lastSentAt).toBe(updatedAt);
  });

  it('스냅샷은 오리지널과 독립이다 — 원본을 수정해도 연동 데이터는 변하지 않는다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    PRODUCTS[0].name = '수정된 상품명';
    PRODUCTS[0].price = 99999;
    PRODUCTS[0].informationDisclosure.name = '수정된 고시정보';
    SETTINGS[0].nickname = '수정된 설정명';

    expect(LINKED[0].productSnapshot.name).toBe('상품-p_001');
    expect(LINKED[0].productSnapshot.price).toBe(10000);
    expect(LINKED[0].productSnapshot.informationDisclosure.name).toBe('');
    expect(LINKED[0].settingSnapshot.nickname).toBe('설정-ss_001');
  });

  it('같은 조합을 다시 전송하면 별도 연동 데이터가 추가되고 외부 상품코드가 서로 다르다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(LINKED).toHaveLength(2);
    expect(LINKED[0].id).not.toBe(LINKED[1].id);
    expect(LINKED[0].externalProductId).not.toBe(LINKED[1].externalProductId);
  });

  it('실패 시 몰별 오류 메시지를 기록하고 외부 상품코드를 부여하지 않는다', () => {
    stubRandom(0.05);

    const result = createMockMallLinkedProducts(
      [
        { productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' },
        { productId: 'p_001', mallCode: 'KAKAOS', shoppingSettingId: 'ss_002' },
        { productId: 'p_001', mallCode: 'COUP', shoppingSettingId: 'ss_003' },
      ],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 3, successCount: 0, failCount: 3 });
    expect(LINKED[0]).toMatchObject({ status: 'failed', errorMessage: '카테고리 매핑 오류' });
    expect(LINKED[1]).toMatchObject({ status: 'failed', errorMessage: '상품명 글자 수 초과' });
    // 전용 메시지가 없는 몰은 공통 fallback을 쓴다
    expect(LINKED[2].errorMessage).toBe('외부 쇼핑몰 전송 실패');
    expect(LINKED[0].externalProductId).toBeUndefined();
  });

  it('이미 성공한 조합을 재전송해 실패하면 중복 등록 메시지를 쓴다', () => {
    stubRandom(0.9);
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    vi.restoreAllMocks();
    stubRandom(0.05);
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(LINKED).toHaveLength(2);
    expect(LINKED[1].errorMessage).toBe('동일 상품이 이미 등록되어 있습니다');
  });

  it('다른 테넌트의 성공 이력은 중복 판정에 영향을 주지 않는다', () => {
    stubRandom(0.9);
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      'usr_other',
      EMAIL,
    );

    vi.restoreAllMocks();
    stubRandom(0.05);
    const result = createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
    // 다른 테넌트(usr_other)의 성공 이력이 있어도 이 테넌트(OWNER_ID) 기준으로는 첫 전송이라
    // 중복 사유가 아니라 몰별 사유가 나와야 한다.
    expect(LINKED[1]).toMatchObject({ status: 'failed', errorMessage: '카테고리 매핑 오류' });
  });

  it('mallCode는 요청 item이 아니라 조회된 setting에서 가져온다 — 어긋난 쌍이 와도 setting 값을 따른다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'KAKAOS', shoppingSettingId: 'ss_001' }], // ss_001은 NSST 설정
      OWNER_ID,
      EMAIL,
    );

    expect(LINKED[0].mallCode).toBe('NSST');
    expect(LINKED[0].settingSnapshot.mallCode).toBe('NSST');
    expect(LINKED[0].externalProductId).toMatch(/^ext_NSST_/);
  });

  it('존재하지 않는 productId는 건너뛰고 집계에 포함하지 않는다', () => {
    stubRandom(0.9);

    const result = createMockMallLinkedProducts(
      [{ productId: 'nope', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 0, successCount: 0, failCount: 0 });
    expect(LINKED).toHaveLength(0);
  });
});
