import { describe, it, expect } from 'vitest';
import { isUnauthorizedError, throwIfUnauthorized, UnauthorizedError } from './unauthorized';

describe('throwIfUnauthorized', () => {
  it('401이면 UnauthorizedError를 던진다', () => {
    expect(() => throwIfUnauthorized(new Response(null, { status: 401 }))).toThrow(UnauthorizedError);
  });

  it.each([200, 400, 403, 500])('%s는 던지지 않는다 — 나머지는 호출부의 !response.ok가 처리한다', (status) => {
    expect(() => throwIfUnauthorized(new Response(null, { status }))).not.toThrow();
  });
});

describe('isUnauthorizedError', () => {
  it('UnauthorizedError만 참이다', () => {
    expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
    expect(isUnauthorizedError(new Error('로그인이 필요합니다.'))).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
  });
});
