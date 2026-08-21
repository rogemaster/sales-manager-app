import { describe, it, expect } from 'vitest';
import {
  validateOptions,
  optionCombinations,
  deriveOptionsFromCombinations,
  toOptionDrafts,
  formatCombinationLabel,
} from './Options';
import type { OptionCombination, ProductOption } from '../types/product.types';

const makeOption = (name: string, values: string[]): ProductOption => ({ name, values });

// ─── validateOptions ──────────────────────────────────────────────────────────

describe('validateOptions', () => {
  it('빈 배열을 받으면 빈 배열을 반환한다', () => {
    expect(validateOptions([])).toEqual([]);
  });

  it('name이 공백만 있는 옵션은 제거한다', () => {
    const options = [makeOption('   ', ['빨강']), makeOption('색상', ['파랑'])];
    const result = validateOptions(options);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('색상');
  });

  it('values가 없는 옵션은 제거한다', () => {
    const options = [makeOption('색상', []), makeOption('사이즈', ['M'])];
    const result = validateOptions(options);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('사이즈');
  });

  it('values 중 공백만 있는 항목은 제거한다', () => {
    const options = [makeOption('색상', ['  ', '빨강', ''])];
    const result = validateOptions(options);
    expect(result[0].values).toEqual(['빨강']);
  });

  it('모든 values가 공백이면 해당 옵션 자체가 제거된다', () => {
    const options = [makeOption('색상', ['  ', ''])];
    expect(validateOptions(options)).toEqual([]);
  });

  it('name과 values의 앞뒤 공백을 제거한다', () => {
    const options = [makeOption(' 색상 ', [' 빨강 ', ' 파랑 '])];
    const result = validateOptions(options);
    expect(result[0].name).toBe('색상');
    expect(result[0].values).toEqual(['빨강', '파랑']);
  });

  it('유효한 옵션은 그대로 반환한다', () => {
    const options = [makeOption('색상', ['빨강', '파랑']), makeOption('사이즈', ['S', 'M', 'L'])];
    expect(validateOptions(options)).toHaveLength(2);
  });
});

// ─── optionCombinations ───────────────────────────────────────────────────────

describe('optionCombinations', () => {
  it('단일 옵션에서 값 개수만큼 조합을 생성한다', () => {
    const options = [makeOption('색상', ['빨강', '파랑', '초록'])];
    expect(optionCombinations(options)).toHaveLength(3);
  });

  it('두 옵션의 카르테시안 곱을 생성한다', () => {
    const options = [makeOption('색상', ['빨강', '파랑']), makeOption('사이즈', ['S', 'M'])];
    expect(optionCombinations(options)).toHaveLength(4); // 2 * 2
  });

  it('세 옵션의 카르테시안 곱을 생성한다', () => {
    const options = [
      makeOption('색상', ['빨강', '파랑']),
      makeOption('사이즈', ['S', 'M']),
      makeOption('소재', ['면', '폴리']),
    ];
    expect(optionCombinations(options)).toHaveLength(8); // 2 * 2 * 2
  });

  it('조합 라벨이 "옵션명: 값" 형식으로 만들어진다', () => {
    const options = [makeOption('색상', ['빨강'])];
    const result = optionCombinations(options);
    expect(formatCombinationLabel(result[0].values)).toBe('색상: 빨강');
  });

  it('복수 옵션의 조합 라벨은 쉼표로 구분된다', () => {
    const options = [makeOption('색상', ['빨강']), makeOption('사이즈', ['S'])];
    const result = optionCombinations(options);
    expect(formatCombinationLabel(result[0].values)).toBe('색상: 빨강, 사이즈: S');
  });

  it('각 조합의 초기값은 quantity=0, optionPrice=0, skuCode="" 이다', () => {
    const options = [makeOption('색상', ['빨강'])];
    const result = optionCombinations(options);
    expect(result[0].quantity).toBe(0);
    expect(result[0].optionPrice).toBe(0);
    expect(result[0].skuCode).toBe('');
  });

  it('각 조합의 values 객체에 옵션명-값 쌍이 포함된다', () => {
    const options = [makeOption('색상', ['빨강']), makeOption('사이즈', ['M'])];
    const result = optionCombinations(options);
    expect(result[0].values).toEqual({ 색상: '빨강', 사이즈: 'M' });
  });

  it('조합은 values·quantity·skuCode·optionPrice 네 필드만 갖는다', () => {
    const result = optionCombinations([makeOption('색상', ['빨강'])]);
    expect(Object.keys(result[0]).sort()).toEqual(['optionPrice', 'quantity', 'skuCode', 'values']);
  });
});

// ─── deriveOptionsFromCombinations ────────────────────────────────────────────

const makeCombination = (values: { [key: string]: string }): OptionCombination => ({
  values,
  quantity: 0,
  skuCode: '',
  optionPrice: 0,
});

describe('deriveOptionsFromCombinations', () => {
  it('빈 배열을 받으면 빈 배열을 반환한다', () => {
    expect(deriveOptionsFromCombinations([])).toEqual([]);
  });

  it('조합의 values 키에서 옵션명을 순서대로 복원한다', () => {
    const combinations = [makeCombination({ 색상: '블랙', 사이즈: 'S' })];
    const result = deriveOptionsFromCombinations(combinations);
    expect(result.map((option) => option.name)).toEqual(['색상', '사이즈']);
  });

  it('옵션값은 전체 조합에서 중복 없이 수집한다', () => {
    const combinations = [
      makeCombination({ 색상: '블랙', 사이즈: 'S' }),
      makeCombination({ 색상: '블랙', 사이즈: 'L' }),
      makeCombination({ 색상: '화이트', 사이즈: 'S' }),
      makeCombination({ 색상: '화이트', 사이즈: 'L' }),
    ];
    const result = deriveOptionsFromCombinations(combinations);
    expect(result[0].values).toEqual(['블랙', '화이트']);
    expect(result[1].values).toEqual(['S', 'L']);
  });

  it('optionCombinations로 만든 조합을 되돌리면 원래 옵션명·값이 나온다', () => {
    const options = [makeOption('색상', ['블랙', '화이트']), makeOption('사이즈', ['S', 'L'])];
    const result = deriveOptionsFromCombinations(optionCombinations(options));
    expect(result).toEqual([
      { name: '색상', values: ['블랙', '화이트'] },
      { name: '사이즈', values: ['S', 'L'] },
    ]);
  });

  it('복원된 옵션은 name·values만 갖는다 (id 없음)', () => {
    const result = deriveOptionsFromCombinations([makeCombination({ 색상: '블랙' })]);
    expect(result[0]).toEqual({ name: '색상', values: ['블랙'] });
  });

  it('일부 조합에 값이 비어 있어도 그 값은 수집하지 않는다', () => {
    const combinations = [makeCombination({ 색상: '블랙' }), makeCombination({ 색상: '' })];
    const result = deriveOptionsFromCombinations(combinations);
    expect(result[0].values).toEqual(['블랙']);
  });
});

// ─── toOptionDrafts ───────────────────────────────────────────────────────────

describe('toOptionDrafts', () => {
  it('빈 배열을 받으면 빈 배열을 반환한다', () => {
    expect(toOptionDrafts([])).toEqual([]);
  });

  it('values 배열을 입력창용 comma-separated 문자열로 바꾼다', () => {
    const options: ProductOption[] = [makeOption('색상', ['블랙', '화이트'])];
    expect(toOptionDrafts(options)[0]).toMatchObject({ name: '색상', values: '블랙, 화이트' });
  });

  it('입력 행 식별용 id를 새로 발급한다', () => {
    const drafts = toOptionDrafts([makeOption('색상', ['블랙']), makeOption('사이즈', ['S'])]);
    expect(drafts[0].id).toMatch(/^opt_/);
    expect(drafts[1].id).not.toBe(drafts[0].id);
  });
});

// ─── formatCombinationLabel ───────────────────────────────────────────────────

describe('formatCombinationLabel', () => {
  it('빈 객체를 받으면 빈 문자열을 반환한다', () => {
    expect(formatCombinationLabel({})).toBe('');
  });

  it('옵션이 하나면 쉼표 없이 만든다', () => {
    expect(formatCombinationLabel({ 색상: '블랙' })).toBe('색상: 블랙');
  });

  it('values의 키 순서를 그대로 따른다', () => {
    expect(formatCombinationLabel({ 사이즈: 'S', 색상: '블랙' })).toBe('사이즈: S, 색상: 블랙');
  });
});
