import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { toNaverProductRequest } from './naverProductRequest';

const PRODUCT = {
  productId: 'prod_1',
  customerCode: 'C-1',
  name: '블루투스 이어폰',
  categoryId: '50000001',
  price: 39000,
  state: 'ON_SALE',
  deliveryType: 'NOT_FREE',
  deliveryPrice: 3000,
  mainImage: 'images/usr_001/abc.png',
  detailPage: '<p>상세</p>',
  totalQuantity: 10,
  option: [{ values: { 색상: '흰색' }, quantity: 5, skuCode: 'S1', optionPrice: 0 }],
  subOption: [{ values: { 케이스: '추가' }, quantity: 3, skuCode: 'S2', optionPrice: 2000 }],
  keyWords: ['이어폰'],
  informationDisclosure: { key: 'etc', id: 'd_1', name: '기타', fields: { 제조자: 'A' } },
  originCountryCode: 'KR',
  adultProductType: 'GENERAL',
  taxType: 'TAXABLE',
  brand: '브랜드',
  manufacturer: '제조사',
  modelName: null,
  modelId: null,
} as unknown as Product;

const SETTING = {
  deliveryCompany: 'CJ',
  shippingAddress: { code: 'naver_seller_1_shipping', name: '', zipCode: '', address: '', addressDetail: '' },
  returnAddress: { code: 'naver_seller_1_return', name: '', zipCode: '', address: '', addressDetail: '' },
} as unknown as ShoppingSetting;

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://img.example.com/'));
afterEach(() => vi.unstubAllEnvs());

describe('toNaverProductRequest', () => {
  it('R2 key를 공개 URL로 바꿔 보낸다 — key를 그대로 보내면 시뮬레이터가 통과시켜 조용히 틀린다', () => {
    const request = toNaverProductRequest(PRODUCT, SETTING);
    expect(request.images.representativeImage.url).toBe('https://img.example.com/images/usr_001/abc.png');
  });

  it.each([
    ['ON_SALE', 'SALE'],
    ['WAIT_SALE', 'WAIT'],
    ['SOLD_OUT', 'OUTOFSTOCK'],
    ['SALE_DIS', 'SUSPENSION'],
  ])('판매상태 %s → %s', (state, statusType) => {
    expect(toNaverProductRequest({ ...PRODUCT, state } as Product, SETTING).statusType).toBe(statusType);
  });

  it.each([
    ['FREE', 'FREE'],
    ['NOT_FREE', 'PAID'],
    ['CHARGE_RECEIVED', 'CHARGE_RECEIVED'],
    ['CONDITIONAL_FREE', 'CONDITIONAL_FREE'],
  ])('배송비 유형 %s → %s', (deliveryType, feeType) => {
    const request = toNaverProductRequest({ ...PRODUCT, deliveryType } as Product, SETTING);
    expect(request.deliveryInfo.deliveryFeeType).toBe(feeType);
  });

  it('모르는 배송비 유형은 바꾸지 않고 그대로 보낸다 — 시뮬레이터가 ENUM으로 거절해야 한다', () => {
    const request = toNaverProductRequest({ ...PRODUCT, deliveryType: 'WEIRD' } as Product, SETTING);
    expect(request.deliveryInfo.deliveryFeeType).toBe('WEIRD');
  });

  it('택배사·출고지·반품지는 설정 스냅샷에서 온다', () => {
    const { deliveryInfo } = toNaverProductRequest(PRODUCT, SETTING);
    expect(deliveryInfo).toMatchObject({
      deliveryCompany: 'CJ',
      shippingAddressId: 'naver_seller_1_shipping',
      returnAddressId: 'naver_seller_1_return',
      baseFee: 3000,
    });
  });

  it('성인상품 여부를 미성년 구매 가능 여부로 뒤집는다', () => {
    expect(toNaverProductRequest(PRODUCT, SETTING).minorPurchasable).toBe(true);
    const adult = toNaverProductRequest({ ...PRODUCT, adultProductType: 'ADULT' } as Product, SETTING);
    expect(adult.minorPurchasable).toBe(false);
  });

  it('원산지: 코드면 코드, 기타면 자유텍스트', () => {
    expect(toNaverProductRequest(PRODUCT, SETTING).originAreaCode).toBe('KR');
    const etc = toNaverProductRequest(
      { ...PRODUCT, originCountryCode: 'ETC', originCountryEtc: '베트남 외' } as Product,
      SETTING,
    );
    expect(etc.originAreaCode).toBe('베트남 외');
  });

  it('기본옵션과 추가옵션을 한 배열로 합친다', () => {
    expect(toNaverProductRequest(PRODUCT, SETTING).optionCombinations).toHaveLength(2);
  });

  it('상품명을 잘라내지 않는다 — 100자 초과는 시뮬레이터가 거절해야 한다', () => {
    const longName = 'a'.repeat(150);
    expect(toNaverProductRequest({ ...PRODUCT, name: longName } as Product, SETTING).name).toBe(longName);
  });

  it('빈 필수 문자열을 채워 넣지 않는다', () => {
    expect(toNaverProductRequest({ ...PRODUCT, categoryId: '' } as Product, SETTING).leafCategoryId).toBe('');
  });

  it('null 선택값은 보내지 않는다', () => {
    const request = toNaverProductRequest(PRODUCT, SETTING) as unknown as Record<string, unknown>;
    expect('modelName' in request).toBe(false);
  });

  it('주소가 없는 설정이면 빈 코드를 보낸다 — 시뮬레이터가 REQUIRED로 거절한다', () => {
    const noAddress = { ...SETTING, shippingAddress: null } as unknown as ShoppingSetting;
    expect(toNaverProductRequest(PRODUCT, noAddress).deliveryInfo.shippingAddressId).toBe('');
  });

  it('빈 문자열 선택값은 지우지 않고 보낸다 — 외부몰이 판정한다', () => {
    const request = toNaverProductRequest({ ...PRODUCT, taxType: '' } as unknown as Product, SETTING);
    expect(request.taxType).toBe('');
  });
});
