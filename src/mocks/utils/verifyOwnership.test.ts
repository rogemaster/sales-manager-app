import { describe, it, expect } from 'vitest';
import { isOwnerMatch, allOwnedBy } from './verifyOwnership';

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

describe('allOwnedBy', () => {
  const data = [
    { id: 'a1', ownerId: 'own_1' },
    { id: 'a2', ownerId: 'own_1' },
    { id: 'a3', ownerId: 'own_2' },
  ];

  it('모든 id가 requestOwnerId 소유면 true를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a2'], 'own_1', data)).toBe(true);
  });

  it('하나라도 다른 ownerId 소유면 false를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a3'], 'own_1', data)).toBe(false);
  });

  it('존재하지 않는 id가 포함되면 false를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a99'], 'own_1', data)).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(allOwnedBy(['a1'], null, data)).toBe(false);
  });

  it('빈 ids 배열이면 true를 반환한다', () => {
    expect(allOwnedBy([], 'own_1', data)).toBe(true);
  });
});
