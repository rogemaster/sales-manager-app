import { describe, it, expect } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import { buildProductBulkPatch, collectCheckedFieldNames, collectClearKeys } from './buildProductBulkPatch';

const VALUES = {
  name: '새 상품명',
  price: 15000,
  netPrice: 9000,
  modelName: '',
  deliveryType: 'PAID',
  deliveryPrice: 3000,
  originCountryCode: 'ETC',
  originCountryEtc: '베트남',
  option: [{ values: { 색상: '빨강' }, quantity: 5, skuCode: 'sku-1', optionPrice: 0 }],
  subOption: [],
  informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: 'ACME' } },
} as unknown as Partial<Product>;

describe('buildProductBulkPatch', () => {
  it('체크된 그룹의 키만 patch에 담는다', () => {
    const patch = buildProductBulkPatch(VALUES, { name: true });

    expect(patch).toEqual({ name: '새 상품명' });
  });

  it('미체크 그룹의 키는 키 자체가 존재하지 않는다', () => {
    const patch = buildProductBulkPatch(VALUES, { name: true });

    // undefined 값으로 담기면 서버 병합에서 기존 값을 지워버린다. 키가 없어야 한다.
    expect('price' in patch).toBe(false);
  });

  it('그룹 하나가 여러 키를 커버하면 체크 하나로 전부 담는다', () => {
    const patch = buildProductBulkPatch(VALUES, { delivery: true, originCountry: true, option: true });

    expect(patch).toEqual({
      deliveryType: 'PAID',
      deliveryPrice: 3000,
      originCountryCode: 'ETC',
      originCountryEtc: '베트남',
      option: VALUES.option,
      subOption: [],
    });
  });

  it('체크했고 값이 빈 문자열이면 빈 문자열을 그대로 담는다 (선택 필드 지우기)', () => {
    const patch = buildProductBulkPatch(VALUES, { modelName: true });

    expect(patch).toEqual({ modelName: '' });
  });

  it('아무것도 체크하지 않으면 빈 객체를 반환한다', () => {
    expect(buildProductBulkPatch(VALUES, {})).toEqual({});
  });

  it('체크했지만 값이 undefined면 키 자체를 담지 않는다 (clearKeys가 따로 나른다)', () => {
    // JSON.stringify가 undefined 값을 가진 키를 지워버려 patch에 담아도 서버까지 가지 못한다.
    const patch = buildProductBulkPatch(VALUES, { taxType: true });

    expect('taxType' in patch).toBe(false);
    expect(patch).toEqual({});
  });
});

describe('collectClearKeys', () => {
  it('체크했지만 값이 undefined인 키만 돌려준다', () => {
    const keys = collectClearKeys(VALUES, { taxType: true, adultProductType: true });

    // 순서는 그룹 선언 순서를 따를 뿐이라 집합으로 비교한다.
    expect([...keys].sort()).toEqual(['adultProductType', 'taxType']);
  });

  it('아무것도 체크하지 않으면 빈 배열을 반환한다', () => {
    expect(collectClearKeys(VALUES, {})).toEqual([]);
  });

  it('값이 빈 문자열인 키는 포함하지 않는다', () => {
    // ''는 "값이 없다"가 아니라 실제로 저장되는 값이라 patch가 그대로 나른다.
    expect(collectClearKeys(VALUES, { modelName: true })).toEqual([]);
  });

  it('그룹의 일부 키만 undefined면 그 키만 돌려준다', () => {
    // originCountryCode는 값이 있고 originCountryEtc만 비었을 때.
    const values = { originCountryCode: 'KR' } as Partial<Product>;

    expect(collectClearKeys(values, { originCountry: true })).toEqual(['originCountryEtc']);
  });
});

describe('collectCheckedFieldNames', () => {
  it('체크된 그룹이 커버하는 키를 평탄화해 돌려준다', () => {
    const names = collectCheckedFieldNames({ delivery: true, name: true });

    // 순서는 그룹 상수의 선언 순서를 따를 뿐이라 집합으로 비교한다 — 가독성을 위해 그룹을 재배치했다고
    // 의미가 같은 이 테스트가 깨져서는 안 된다.
    expect([...names].sort()).toEqual(['deliveryPrice', 'deliveryType', 'name']);
  });

  it('미체크 그룹의 키는 포함하지 않는다', () => {
    // 정보고시에는 required 규칙이 있어, 체크하지 않았는데 목록에 들어가면 제출이 막힌다.
    expect(collectCheckedFieldNames({ name: true })).not.toContain('informationDisclosure');
  });

  it('아무것도 체크하지 않으면 빈 배열을 반환한다', () => {
    expect(collectCheckedFieldNames({})).toEqual([]);
  });
});
