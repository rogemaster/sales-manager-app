import { describe, it, expect } from 'vitest';
import { toPublicUser } from './publicUser';

describe('toPublicUser', () => {
  it('비밀번호 해시를 응답에서 뺀다', () => {
    const row = { id: 'usr_1', email: 'a@b.com', password: 'scrypt$hash', name: '홍길동' };
    const user = toPublicUser(row);
    expect(user).toEqual({ id: 'usr_1', email: 'a@b.com', name: '홍길동' });
    expect('password' in user).toBe(false);
  });
});
