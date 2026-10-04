import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from './likePattern';

describe('escapeLikePattern', () => {
  it('%·_·\\를 글자로 찾도록 이스케이프한다', () => {
    expect(escapeLikePattern('50%_할인\\')).toBe('50\\%\\_할인\\\\');
    expect(escapeLikePattern('홍길동')).toBe('홍길동');
  });

  it('특수문자만 있는 검색어도 각각 이스케이프한다', () => {
    expect(escapeLikePattern('%')).toBe('\\%');
    expect(escapeLikePattern('__')).toBe('\\_\\_');
  });
});
