import { describe, it, expect } from 'vitest';
import { isSubUserGrade, resolveNewUserStatus } from './userStatus';

describe('resolveNewUserStatus', () => {
  it('super_admin이 등록하면 바로 active', () => {
    expect(resolveNewUserStatus('super_admin')).toBe('active');
  });

  it('admin이 등록하면 승인 대기(pending)', () => {
    expect(resolveNewUserStatus('admin')).toBe('pending');
  });

  it('그 밖의 등급은 안전한 쪽(pending)으로 둔다', () => {
    expect(resolveNewUserStatus('operator')).toBe('pending');
  });
});

describe('isSubUserGrade', () => {
  it.each(['admin', 'operator'])('%s는 부여 가능한 등급이다', (value) => {
    expect(isSubUserGrade(value)).toBe(true);
  });

  it.each(['super_admin', 'owner', '', null, undefined, 1])('%s는 부여할 수 없다', (value) => {
    expect(isSubUserGrade(value)).toBe(false);
  });
});
