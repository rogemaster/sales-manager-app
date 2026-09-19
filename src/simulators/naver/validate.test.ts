import { describe, expect, it } from 'vitest';
import { findInvalidInputs, NAME_MAX_LENGTH, SALE_PRICE_MAX, STOCK_QUANTITY_MAX } from './validate';

const validBody = () => ({
  name: '테스트 상품',
  statusType: 'SALE',
  leafCategoryId: 'CAT_1',
  detailContent: '<p>상세</p>',
  images: { representativeImage: { url: 'https://cdn.example.com/a.png' } },
  salePrice: 10000,
  stockQuantity: 5,
  deliveryInfo: {
    deliveryFeeType: 'FREE',
    baseFee: 0,
    deliveryCompany: 'CJ',
    shippingAddressId: 'ADDR_S1',
    returnAddressId: 'ADDR_R1',
  },
  brandName: '브랜드',
  manufacturerName: '제조사',
  productInfoProvidedNotice: { type: 'ETC' },
});

const namesOf = (body: unknown) => findInvalidInputs(body).map((e) => e.name);

describe('findInvalidInputs', () => {
  it('정상 요청은 위반이 없다', () => {
    expect(findInvalidInputs(validBody())).toEqual([]);
  });

  it('객체가 아니면 TYPE 위반 하나를 낸다', () => {
    const errors = findInvalidInputs('문자열');
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('TYPE');
  });

  it('필수 문자열이 없으면 REQUIRED다', () => {
    const body = { ...validBody(), name: undefined };
    const error = findInvalidInputs(body).find((e) => e.name === 'name');
    expect(error?.type).toBe('REQUIRED');
  });

  it('빈 문자열도 REQUIRED다', () => {
    const body = { ...validBody(), brandName: '   ' };
    expect(findInvalidInputs(body).find((e) => e.name === 'brandName')?.type).toBe('REQUIRED');
  });

  it('상품명이 100자를 넘으면 LENGTH다', () => {
    const body = { ...validBody(), name: 'ㄱ'.repeat(NAME_MAX_LENGTH + 1) };
    expect(findInvalidInputs(body).find((e) => e.name === 'name')?.type).toBe('LENGTH');
  });

  it('허용되지 않은 statusType은 ENUM이다', () => {
    const body = { ...validBody(), statusType: 'ON_SALE' };
    expect(findInvalidInputs(body).find((e) => e.name === 'statusType')?.type).toBe('ENUM');
  });

  it('목록에 없는 택배사는 ENUM이다', () => {
    const body = validBody();
    body.deliveryInfo.deliveryCompany = 'UNKNOWN_EXPRESS';
    expect(findInvalidInputs(body).find((e) => e.name === 'deliveryInfo.deliveryCompany')?.type).toBe('ENUM');
  });

  it('가격이 정수가 아니면 TYPE이다', () => {
    const body = { ...validBody(), salePrice: 1000.5 };
    expect(findInvalidInputs(body).find((e) => e.name === 'salePrice')?.type).toBe('TYPE');
  });

  it('가격이 상한을 넘으면 RANGE다', () => {
    const body = { ...validBody(), salePrice: SALE_PRICE_MAX + 1 };
    expect(findInvalidInputs(body).find((e) => e.name === 'salePrice')?.type).toBe('RANGE');
  });

  it('음수 재고는 RANGE다', () => {
    const body = { ...validBody(), stockQuantity: -1 };
    expect(findInvalidInputs(body).find((e) => e.name === 'stockQuantity')?.type).toBe('RANGE');
  });

  it('재고가 상한을 넘으면 RANGE다', () => {
    const body = { ...validBody(), stockQuantity: STOCK_QUANTITY_MAX + 1 };
    expect(findInvalidInputs(body).find((e) => e.name === 'stockQuantity')?.type).toBe('RANGE');
  });

  it('상품명이 정확히 100자면 통과한다', () => {
    const body = { ...validBody(), name: 'ㄱ'.repeat(NAME_MAX_LENGTH) };
    expect(findInvalidInputs(body)).toEqual([]);
  });

  it('대표 이미지 URL이 없으면 REQUIRED다', () => {
    const body = { ...validBody(), images: { representativeImage: {} } };
    expect(namesOf(body)).toContain('images.representativeImage.url');
  });

  it('주소록 ID가 비면 REQUIRED다', () => {
    const body = validBody();
    body.deliveryInfo.shippingAddressId = '';
    expect(findInvalidInputs(body).find((e) => e.name === 'deliveryInfo.shippingAddressId')?.type).toBe('REQUIRED');
  });

  it('선택 필드를 채워도 통과한다', () => {
    const body = {
      ...validBody(),
      sellerManagementCode: 'CUST-1',
      modelName: '모델',
      modelId: 'M-1',
      taxType: 'TAXABLE',
      originAreaCode: 'KR',
      minorPurchasable: true,
      sellerTags: ['태그1'],
      optionCombinations: [{ values: { 색상: '검정' }, quantity: 1, skuCode: 'SKU-1', optionPrice: 0 }],
    };
    expect(findInvalidInputs(body)).toEqual([]);
  });

  it('선택 필드 타입이 틀리면 TYPE이다', () => {
    const body = { ...validBody(), sellerTags: '태그' };
    expect(findInvalidInputs(body).find((e) => e.name === 'sellerTags')?.type).toBe('TYPE');
  });

  it('위반이 여러 개면 첫 위반에서 멈추지 않고 전부 모은다', () => {
    const body = { ...validBody(), name: undefined, salePrice: -1, statusType: 'WRONG' };
    const names = namesOf(body);
    expect(names).toEqual(expect.arrayContaining(['name', 'salePrice', 'statusType']));
  });

  it('images가 객체가 아니면 TYPE이다', () => {
    const body = { ...validBody(), images: '이미지' };
    expect(findInvalidInputs(body).find((e) => e.name === 'images')?.type).toBe('TYPE');
  });

  it('deliveryInfo가 배열이면 TYPE이다', () => {
    const body = { ...validBody(), deliveryInfo: [] };
    expect(findInvalidInputs(body).find((e) => e.name === 'deliveryInfo')?.type).toBe('TYPE');
  });

  it('productInfoProvidedNotice가 문자열이면 TYPE이다', () => {
    const body = { ...validBody(), productInfoProvidedNotice: '고시' };
    expect(findInvalidInputs(body).find((e) => e.name === 'productInfoProvidedNotice')?.type).toBe('TYPE');
  });

  it('enum 필드에 문자열이 아닌 값이 오면 TYPE이다', () => {
    const body = { ...validBody(), statusType: 123 };
    expect(findInvalidInputs(body).find((e) => e.name === 'statusType')?.type).toBe('TYPE');
  });

  it('필수 값이 null이면 REQUIRED다', () => {
    const body = { ...validBody(), name: null, salePrice: null, statusType: null };
    const errors = findInvalidInputs(body);
    expect(errors.find((e) => e.name === 'name')?.type).toBe('REQUIRED');
    expect(errors.find((e) => e.name === 'salePrice')?.type).toBe('REQUIRED');
    expect(errors.find((e) => e.name === 'statusType')?.type).toBe('REQUIRED');
  });

  it('숫자 자리에 NaN이 오면 TYPE이다', () => {
    const body = { ...validBody(), salePrice: Number.NaN };
    expect(findInvalidInputs(body).find((e) => e.name === 'salePrice')?.type).toBe('TYPE');
  });

  it('선택 필드가 null이면 위반이 아니다', () => {
    const body = {
      ...validBody(),
      sellerManagementCode: null,
      modelName: null,
      modelId: null,
      originAreaCode: null,
      taxType: null,
      minorPurchasable: null,
      sellerTags: null,
      optionCombinations: null,
    };
    expect(findInvalidInputs(body)).toEqual([]);
  });
});
