import { describe, it, expect } from 'vitest';
import { clampPositiveInt, getPage } from './pagination';

describe('getPage', () => {
  it('전체 페이지가 범위 이하이면 전부 보여준다', () => {
    expect(getPage(10, 1, 3)).toEqual([1, 2, 3]);
  });

  it('현재 페이지가 속한 블록의 번호만 보여준다', () => {
    expect(getPage(10, 1, 25)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(getPage(10, 12, 25)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('마지막 블록은 전체 페이지에서 끊는다', () => {
    expect(getPage(10, 23, 25)).toEqual([21, 22, 23, 24, 25]);
  });
});

describe('clampPositiveInt', () => {
  it('1 미만·숫자가 아니면 fallback이다', () => {
    expect(clampPositiveInt(0, 10, 100)).toBe(10);
    expect(clampPositiveInt('abc', 10, 100)).toBe(10);
  });

  it('상한을 넘으면 상한으로 자른다', () => {
    expect(clampPositiveInt(1000, 10, 100)).toBe(100);
  });
});
