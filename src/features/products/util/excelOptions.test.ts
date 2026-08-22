import { describe, it, expect } from 'vitest';
import {
  buildCombinationsFromExcel,
  formatExcelOptionSummary,
  resolveExcelTotalQuantity,
  resolveTotalQuantity,
  toExcelOptionPairs,
  toText,
} from './excelOptions';
import { productExcelSaveStrategy } from '@/components/excel/strategies/productExcelSaveStrategy';

// ─── toText ───────────────────────────────────────────────────────────────────

describe('toText', () => {
  it('문자열은 앞뒤 공백을 제거해 돌려준다', () => {
    expect(toText('  블랙  ')).toBe('블랙');
  });

  it('숫자로 파싱된 셀을 문자열로 바꾼다', () => {
    expect(toText(90)).toBe('90');
  });

  it('null·undefined·빈 문자열은 빈 문자열이 된다', () => {
    expect(toText(null)).toBe('');
    expect(toText(undefined)).toBe('');
    expect(toText('   ')).toBe('');
  });

  it('배열(ValidationError[])은 빈 문자열이 된다', () => {
    expect(toText([{ row: 1, header: '상품명', code: 'EMPTY_VALUE' }])).toBe('');
  });
});

// ─── buildCombinationsFromExcel ───────────────────────────────────────────────

describe('buildCombinationsFromExcel', () => {
  const pairs = [
    { name: '색상', values: '블랙,화이트' },
    { name: '사이즈', values: 'S,M,L' },
  ];

  it('옵션 2개(2값 × 3값)로 조합 6개를 만든다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result).toHaveLength(6);
  });

  it('조합의 values 맵이 옵션명을 키로 갖는다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.[0].values).toEqual({ 색상: '블랙', 사이즈: 'S' });
    expect(result?.[5].values).toEqual({ 색상: '화이트', 사이즈: 'L' });
  });

  it('모든 조합의 quantity가 인자값과 같다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.every((combination) => combination.quantity === 100)).toBe(true);
  });

  it('skuPrefix가 있으면 001부터 3자리 zero-pad로 채번한다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.map((combination) => combination.skuCode)).toEqual([
      'TSHIRT-001',
      'TSHIRT-002',
      'TSHIRT-003',
      'TSHIRT-004',
      'TSHIRT-005',
      'TSHIRT-006',
    ]);
  });

  it('skuPrefix가 빈 문자열이면 모든 skuCode가 빈 문자열이다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, '');
    expect(result?.every((combination) => combination.skuCode === '')).toBe(true);
  });

  it('optionPrice는 항상 0이다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.every((combination) => combination.optionPrice === 0)).toBe(true);
  });

  it('pair가 전부 비어 있으면 undefined를 반환한다', () => {
    expect(buildCombinationsFromExcel([{ name: '', values: '' }], 100, 'TSHIRT')).toBeUndefined();
  });

  it('옵션명만 있고 값이 비어 있으면 그 옵션을 제외한다', () => {
    const result = buildCombinationsFromExcel(
      [
        { name: '색상', values: '블랙,화이트' },
        { name: '사이즈', values: '' },
      ],
      100,
      '',
    );
    expect(result).toHaveLength(2);
    expect(result?.[0].values).toEqual({ 색상: '블랙' });
  });

  it('남는 옵션이 하나도 없으면 undefined를 반환한다', () => {
    expect(buildCombinationsFromExcel([{ name: '색상', values: '   ' }], 100, '')).toBeUndefined();
  });

  it('옵션값이 숫자로 파싱된 셀이어도 문자열로 처리한다', () => {
    const result = buildCombinationsFromExcel([{ name: '사이즈', values: 90 }], 100, '');
    expect(result?.[0].values).toEqual({ 사이즈: '90' });
  });

  it('콤마 주변 공백을 제거한다', () => {
    const result = buildCombinationsFromExcel([{ name: '색상', values: '블랙, 화이트 ' }], 100, '');
    expect(result?.map((combination) => combination.values.색상)).toEqual(['블랙', '화이트']);
  });
});

// ─── formatExcelOptionSummary ─────────────────────────────────────────────────

describe('formatExcelOptionSummary', () => {
  const basic = [
    { name: '색상', values: '블랙,화이트' },
    { name: '사이즈', values: 'S,M,L' },
  ];
  const sub = [{ name: '각인', values: '유,무' }];

  it('기본옵션과 추가옵션을 슬래시로 잇고 추가옵션에 접두사를 붙인다', () => {
    expect(formatExcelOptionSummary(basic, sub)).toBe('색상: 블랙,화이트 / 사이즈: S,M,L / 추가) 각인: 유,무');
  });

  it('추가옵션만 있으면 추가옵션 항목만 돌려준다', () => {
    expect(formatExcelOptionSummary([], sub)).toBe('추가) 각인: 유,무');
  });

  it('기본옵션만 있으면 기본옵션 항목만 돌려준다', () => {
    expect(formatExcelOptionSummary(basic, [])).toBe('색상: 블랙,화이트 / 사이즈: S,M,L');
  });

  it('둘 다 없으면 빈 문자열을 돌려준다', () => {
    expect(formatExcelOptionSummary([{ name: '', values: '' }], [{ name: '', values: '' }])).toBe('');
  });

  it('이름만 있고 값이 비어 있는 항목은 건너뛴다', () => {
    expect(formatExcelOptionSummary([{ name: '색상', values: '' }], [])).toBe('');
  });

  it('콤마 주변 공백을 정규화해 표시한다', () => {
    expect(formatExcelOptionSummary([{ name: '색상', values: '블랙, 화이트 ' }], [])).toBe('색상: 블랙,화이트');
  });
});

// ─── toExcelOptionPairs ───────────────────────────────────────────────────────

describe('toExcelOptionPairs', () => {
  it('옵션 컬럼을 기본옵션 2쌍과 추가옵션 1쌍으로 묶는다', () => {
    const result = toExcelOptionPairs({
      옵션명1: '색상',
      옵션값1: '블랙,화이트',
      옵션명2: '사이즈',
      옵션값2: 'S,M,L',
      추가옵션명: '각인',
      추가옵션값: '유,무',
    });

    expect(result.pairs).toEqual([
      { name: '색상', values: '블랙,화이트' },
      { name: '사이즈', values: 'S,M,L' },
    ]);
    expect(result.subPairs).toEqual([{ name: '각인', values: '유,무' }]);
  });

  it('옵션 컬럼이 없는 행도 같은 모양으로 묶는다', () => {
    const result = toExcelOptionPairs({ 상품명: '테스트' });

    expect(result.pairs).toHaveLength(2);
    expect(result.subPairs).toHaveLength(1);
    expect(result.pairs[0].name).toBeUndefined();
  });
});

// ─── resolveTotalQuantity ─────────────────────────────────────────────────────

describe('resolveTotalQuantity', () => {
  it('기본옵션이 있으면 조합 수만큼 곱한다', () => {
    const option = buildCombinationsFromExcel([{ name: '색상', values: '블랙,화이트' }], 100, '');

    expect(resolveTotalQuantity(option, 100)).toBe(200);
  });

  it('기본옵션이 없으면 총수량을 그대로 쓴다', () => {
    expect(resolveTotalQuantity(undefined, 100)).toBe(100);
  });
});

// ─── resolveExcelTotalQuantity ────────────────────────────────────────────────

describe('resolveExcelTotalQuantity', () => {
  it('옵션이 있는 행은 조합 수를 곱한 값을 돌려준다', () => {
    const total = resolveExcelTotalQuantity({
      총수량: 100,
      옵션명1: '색상',
      옵션값1: '블랙,화이트',
      옵션명2: '사이즈',
      옵션값2: 'S,M,L',
    });

    expect(total).toBe(600);
  });

  it('추가옵션은 총수량에 반영하지 않는다', () => {
    const total = resolveExcelTotalQuantity({ 총수량: 100, 추가옵션명: '각인', 추가옵션값: '유,무' });

    expect(total).toBe(100);
  });

  it('옵션이 없는 행은 총수량을 그대로 돌려준다', () => {
    expect(resolveExcelTotalQuantity({ 총수량: 100 })).toBe(100);
  });

  it('총수량이 비어 있으면 0을 돌려준다', () => {
    expect(resolveExcelTotalQuantity({ 옵션명1: '색상', 옵션값1: '블랙,화이트' })).toBe(0);
  });

  it('전략이 저장하는 총수량과 같은 값을 돌려준다', () => {
    const row = { 총수량: 100, 옵션명1: '색상', 옵션값1: '블랙,화이트', SKU: 'TSHIRT' };
    const [product] = productExcelSaveStrategy([
      { ...row, 상품명: '테스트', 카테고리: 'C', 브랜드: 'B', 제조업체: 'M', 판매가: 1000, 배송비: 0 },
    ]);

    expect(resolveExcelTotalQuantity(row)).toBe(product.totalQuantity);
  });
});
