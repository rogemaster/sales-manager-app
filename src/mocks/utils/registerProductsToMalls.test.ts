import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const { PRODUCTS, resetProducts } = vi.hoisted(() => {
  const makeProduct = (overrides: Partial<Product>): Product =>
    ({
      productId: 'p_001',
      name: '상품A',
      categoryId: 'c00001',
      price: 10000,
      state: 'ON_SALE',
      deliveryType: 'FREE',
      deliveryPrice: 0,
      mainImage: '',
      detailPage: '',
      totalQuantity: 10,
      createDate: new Date('2025-01-01'),
      updateDate: new Date('2025-01-01'),
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      ownerId: 'usr_001',
      ...overrides,
    }) as Product;

  const PRODUCTS: Product[] = [];

  const resetProducts = () => {
    PRODUCTS.length = 0;
    PRODUCTS.push(makeProduct({ productId: 'p_001' }), makeProduct({ productId: 'p_002' }));
  };

  resetProducts();

  return { PRODUCTS, resetProducts };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

import { registerMockProductsToMalls } from './registerProductsToMalls';

describe('registerMockProductsToMalls', () => {
  beforeEach(() => {
    resetProducts();
  });

  // 성공/실패는 Math.random()으로 판정한다. 성공 경로는 externalId 생성에도 난수를 쓰므로
  // mockReturnValueOnce 체인을 쓰면 호출 횟수에 따라 결과가 어긋난다. 항상 mockReturnValue로 고정한다.
  const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('해당 상품의 registeredMalls에 성공 상태로 항목을 추가하고 처리 건수를 반환한다', () => {
    stubRandom(0.9);

    const result = registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_003' }]);

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({
      mallCode: 'NSST',
      shoppingSettingId: 'ss_003',
      status: 'success',
    });
  });

  it('같은 몰-설정 조합을 다시 전송하면 이력이 쌓이지 않고 기존 항목이 갱신된다', () => {
    stubRandom(0.9);

    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    const firstId = PRODUCTS[1].registeredMalls?.[0].id;

    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[1].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[1].registeredMalls?.[0].id).toBe(firstId);
  });

  it('같은 상품이라도 몰-설정 조합이 다르면 별도 항목으로 추가된다', () => {
    stubRandom(0.9);

    registerMockProductsToMalls([
      { productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' },
      { productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_002' },
      { productId: 'p_002', mallCode: 'NSST', shoppingSettingId: 'ss_001' },
    ]);

    expect(PRODUCTS[1].registeredMalls).toHaveLength(3);
  });

  it('존재하지 않는 productId는 건너뛰고 건수에 포함하지 않는다', () => {
    stubRandom(0.9);

    const result = registerMockProductsToMalls([{ productId: 'nope', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);

    expect(result).toEqual({ totalCount: 0, successCount: 0, failCount: 0 });
  });

  it('실패 판정 시 status와 몰별 오류 메시지를 기록하고 failCount로 집계한다', () => {
    stubRandom(0.05);

    const result = registerMockProductsToMalls([
      { productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' },
      { productId: 'p_001', mallCode: 'KAKAOS', shoppingSettingId: 'ss_002' },
      { productId: 'p_001', mallCode: 'COUP', shoppingSettingId: 'ss_003' },
    ]);

    expect(result).toEqual({ totalCount: 3, successCount: 0, failCount: 3 });
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({ status: 'failed', errorMessage: '카테고리 매핑 오류' });
    expect(PRODUCTS[0].registeredMalls?.[1]).toMatchObject({ status: 'failed', errorMessage: '상품명 글자 수 초과' });
    // 전용 메시지가 없는 몰은 공통 fallback을 쓴다
    expect(PRODUCTS[0].registeredMalls?.[2].errorMessage).toBe('외부 쇼핑몰 전송 실패');
  });

  it('성공 시 externalId를 부여한다', () => {
    stubRandom(0.9);

    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toMatch(/^ext_NSST_/);
  });

  it('실패한 조합을 재전송해 성공하면 errorMessage를 지우고 externalId를 채운다', () => {
    stubRandom(0.05);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);
    expect(PRODUCTS[0].registeredMalls?.[0].errorMessage).toBeDefined();

    vi.restoreAllMocks();
    stubRandom(0.9);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0].status).toBe('success');
    expect(PRODUCTS[0].registeredMalls?.[0].errorMessage).toBeUndefined();
    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toMatch(/^ext_NSST_/);
  });

  it('이미 성공한 조합을 다시 전송해도 externalId는 새로 발급하지 않는다', () => {
    stubRandom(0.9);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);
    const firstExternalId = PRODUCTS[0].registeredMalls?.[0].externalId;

    vi.restoreAllMocks();
    // 두 번째 전송은 다른 난수를 쓴다 — 재발급이 일어나면 다른 id가 나와 실패한다
    stubRandom(0.95);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toBe(firstExternalId);
  });

  it('성공한 조합이 재전송에서 실패해도 externalId는 보존한다', () => {
    stubRandom(0.9);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);
    const externalId = PRODUCTS[0].registeredMalls?.[0].externalId;

    vi.restoreAllMocks();
    stubRandom(0.05);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls?.[0].status).toBe('failed');
    expect(PRODUCTS[0].registeredMalls?.[0].errorMessage).toBe('카테고리 매핑 오류');
    // 외부몰에 이미 올라간 상품의 수정 전송이 실패한 것이므로 외부 ID 자체는 여전히 유효하다
    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toBe(externalId);
  });
});
