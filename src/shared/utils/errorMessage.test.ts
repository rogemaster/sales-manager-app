import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errorMessage';

describe('getErrorMessage', () => {
  it('Error의 message를 돌려준다', () => {
    expect(getErrorMessage(new Error('이미 사용 중인 코드입니다.'), '실패')).toBe('이미 사용 중인 코드입니다.');
  });

  it('message가 비어 있으면 fallback이다', () => {
    expect(getErrorMessage(new Error(''), '실패')).toBe('실패');
  });

  it.each(['문자열', 42, null, undefined, { message: '객체' }])('Error가 아니면 fallback이다 — %j', (error) => {
    expect(getErrorMessage(error, '실패')).toBe('실패');
  });
});
