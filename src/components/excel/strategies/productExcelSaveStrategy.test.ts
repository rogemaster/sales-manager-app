import { describe, expect, it } from 'vitest';
import { productExcelSaveStrategy } from './productExcelSaveStrategy';
import { ExcelRowWithErrors } from '@/types/excel.type';

const baseRow: ExcelRowWithErrors = {
  상품명: '테스트 상품',
  카테고리: 'CAT-001',
  판매가: 10000,
  판매상태: '판매중',
  배송정책: '무료배송',
  배송비: 0,
  메인이미지: 'https://example.com/main.png',
  상세설명: '<p>상세</p>',
  총수량: 10,
};

describe('productExcelSaveStrategy - 브랜드 및 모델 정보', () => {
  it('브랜드·제조업체·모델명·모델번호를 도메인 필드로 매핑한다', () => {
    const [product] = productExcelSaveStrategy([
      { ...baseRow, 브랜드: '테스트브랜드', 제조업체: '테스트제조사', 모델명: 'MD-0001', 모델번호: 'A0001' },
    ]);

    expect(product.brand).toBe('테스트브랜드');
    expect(product.manufacturer).toBe('테스트제조사');
    expect(product.modelName).toBe('MD-0001');
    expect(product.modelId).toBe('A0001');
  });

  it('시트에서 숫자로 파싱된 모델번호도 문자열로 저장한다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 브랜드: 'B', 제조업체: 'M', 모델번호: 10000001 }]);

    expect(product.modelId).toBe('10000001');
  });

  it('선택 항목인 모델명·모델번호가 비어 있으면 undefined로 둔다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 브랜드: 'B', 제조업체: 'M', 모델명: '', 모델번호: '' }]);

    expect(product.modelName).toBeUndefined();
    expect(product.modelId).toBeUndefined();
  });
});

describe('productExcelSaveStrategy - 옵션 및 SKU', () => {
  const optionRow: ExcelRowWithErrors = {
    ...baseRow,
    브랜드: 'B',
    제조업체: 'M',
    총수량: 100,
    옵션명1: '색상',
    옵션값1: '블랙,화이트',
    옵션명2: '사이즈',
    옵션값2: 'S,M,L',
    추가옵션명: '각인',
    추가옵션값: '유,무',
    SKU: 'TSHIRT',
    추가SKU: 'ENGRAVE',
  };

  it('기본옵션 컬럼으로 조합을 만들고 SKU 접두사로 채번한다', () => {
    const [product] = productExcelSaveStrategy([optionRow]);

    expect(product.option).toHaveLength(6);
    expect(product.option?.[0].values).toEqual({ 색상: '블랙', 사이즈: 'S' });
    expect(product.option?.every((combination) => /^TSHIRT-[0-9a-f]{8}$/.test(combination.skuCode))).toBe(true);
  });

  it('추가옵션 컬럼은 subOption으로 가고 추가SKU 접두사를 쓴다', () => {
    const [product] = productExcelSaveStrategy([optionRow]);

    expect(product.subOption).toHaveLength(2);
    expect(product.subOption?.[0].values).toEqual({ 각인: '유' });
    expect(product.subOption?.every((combination) => /^ENGRAVE-[0-9a-f]{8}$/.test(combination.skuCode))).toBe(true);
  });

  it('같은 접두사를 쓴 다른 상품끼리도 skuCode가 겹치지 않는다', () => {
    const products = productExcelSaveStrategy([optionRow, optionRow]);
    const skuCodes = products.flatMap((product) => product.option?.map((combination) => combination.skuCode) ?? []);

    expect(new Set(skuCodes).size).toBe(12);
  });

  it('모든 조합의 수량에 총수량 값을 넣고 totalQuantity를 조합수만큼 곱해 다시 계산한다', () => {
    const [product] = productExcelSaveStrategy([optionRow]);

    expect(product.option?.every((combination) => combination.quantity === 100)).toBe(true);
    expect(product.totalQuantity).toBe(600);
  });

  it('추가옵션은 totalQuantity 재계산에 반영하지 않는다', () => {
    const [product] = productExcelSaveStrategy([
      { ...baseRow, 브랜드: 'B', 제조업체: 'M', 총수량: 100, 추가옵션명: '각인', 추가옵션값: '유,무' },
    ]);

    expect(product.option).toBeUndefined();
    expect(product.subOption).toHaveLength(2);
    expect(product.totalQuantity).toBe(100);
  });

  it('옵션 컬럼이 비어 있으면 option·subOption이 undefined이고 총수량을 그대로 쓴다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 브랜드: 'B', 제조업체: 'M', 총수량: 100, SKU: 'X' }]);

    expect(product.option).toBeUndefined();
    expect(product.subOption).toBeUndefined();
    expect(product.totalQuantity).toBe(100);
  });

  it('SKU 접두사가 비어 있으면 조합은 만들되 skuCode를 채우지 않는다', () => {
    const [product] = productExcelSaveStrategy([
      { ...baseRow, 브랜드: 'B', 제조업체: 'M', 총수량: 100, 옵션명1: '색상', 옵션값1: '블랙,화이트' },
    ]);

    expect(product.option).toHaveLength(2);
    expect(product.option?.every((combination) => combination.skuCode === '')).toBe(true);
  });
});

describe('productExcelSaveStrategy - 표시명을 코드로 치환', () => {
  it('판매상태 한글 표시명을 코드로 바꾼다', () => {
    const rows = ['판매중', '판매대기', '품절', '판매중지'].map((state) => ({ ...baseRow, 판매상태: state }));

    expect(productExcelSaveStrategy(rows).map((p) => p.state)).toEqual([
      'ON_SALE',
      'WAIT_SALE',
      'SOLD_OUT',
      'SALE_DIS',
    ]);
  });

  it('배송정책 한글 표시명을 코드로 바꾼다', () => {
    const rows = ['무료배송', '유료배송', '착불', '조건부 무료배송'].map((type) => ({ ...baseRow, 배송정책: type }));

    expect(productExcelSaveStrategy(rows).map((p) => p.deliveryType)).toEqual([
      'FREE',
      'NOT_FREE',
      'CHARGE_RECEIVED',
      'CONDITIONAL_FREE',
    ]);
  });

  it('앞뒤 공백이 붙은 표시명도 코드로 바꾼다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 판매상태: ' 판매중 ', 배송정책: ' 무료배송 ' }]);

    expect(product.state).toBe('ON_SALE');
    expect(product.deliveryType).toBe('FREE');
  });

  it('표시명이 아닌 값은 코드로 새어 나가지 않는다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 판매상태: '판매중임', 배송정책: '무료' }]);

    expect(product.state).toBe('WAIT_SALE');
    expect(product.deliveryType).toBe('');
  });

  it('이미 코드값으로 적힌 값도 표시명이 아니므로 통과시키지 않는다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 판매상태: 'ON_SALE', 배송정책: 'FREE' }]);

    expect(product.state).toBe('WAIT_SALE');
    expect(product.deliveryType).toBe('');
  });
});
