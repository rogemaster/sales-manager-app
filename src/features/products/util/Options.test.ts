import { describe, it, expect } from 'vitest';
import { validateOptions, optionCombinations } from './Options';
import type { ProductOption } from '../types/product.types';

const makeOption = (name: string, values: string[]): ProductOption => ({
  id: `opt-${name}`,
  name,
  values,
});

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

  it('combination 문자열이 "옵션명: 값" 형식으로 생성된다', () => {
    const options = [makeOption('색상', ['빨강'])];
    const result = optionCombinations(options);
    expect(result[0].combination).toBe('색상: 빨강');
  });

  it('복수 옵션의 combination은 쉼표로 구분된다', () => {
    const options = [makeOption('색상', ['빨강']), makeOption('사이즈', ['S'])];
    const result = optionCombinations(options);
    expect(result[0].combination).toBe('색상: 빨강, 사이즈: S');
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
});
