import { describe, it, expect } from 'vitest';
import { isOwnerMatch } from './verifyOwnership';

describe('isOwnerMatch', () => {
  it('resourceOwnerId와 requestOwnerId가 같으면 true를 반환한다', () => {
    expect(isOwnerMatch('usr_001', 'usr_001')).toBe(true);
  });

  it('resourceOwnerId와 requestOwnerId가 다르면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', 'usr_002')).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', null)).toBe(false);
  });

  it('requestOwnerId가 빈 문자열이면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', '')).toBe(false);
  });
});
