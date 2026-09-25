import { describe, it, expect } from 'vitest';
import { getCategoryName } from './category.constant';

describe('getCategoryName', () => {
  it('id가 정확히 같은 카테고리 이름을 돌려준다', () => {
    expect(getCategoryName('c00001')).toBe('의류');
    expect(getCategoryName('c00012')).toBe('스포츠');
  });

  it('없는 id면 undefined다', () => {
    expect(getCategoryName('')).toBeUndefined();
    expect(getCategoryName('c99999')).toBeUndefined();
  });

  it('id를 포함하는 다른 문자열은 같은 카테고리로 보지 않는다 — 예전 includes 비교는 여기서 "의류"를 돌려줬다', () => {
    expect(getCategoryName('xc00001y')).toBeUndefined();
  });
});
