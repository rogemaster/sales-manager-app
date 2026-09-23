import { describe, it, expect } from 'vitest';
import { AVATAR_MAX_LENGTH, createUserSchema } from './userCreateSchema';

const VALID = {
  email: 'staff@example.com',
  password: 'secret1',
  grade: 'admin',
  name: '직원',
  phone: '010-1234-5678',
  avatar: '',
  bio: '',
};

describe('createUserSchema', () => {
  it('유효한 본문을 통과시킨다', () => {
    expect(createUserSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(['super_admin', 'owner', ''])('등급 %s는 거부한다 — super_admin은 가입으로만 생긴다', (grade) => {
    expect(createUserSchema.safeParse({ ...VALID, grade }).success).toBe(false);
  });

  it('이름이 100자를 넘으면 거부한다', () => {
    expect(createUserSchema.safeParse({ ...VALID, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('소개가 500자를 넘으면 거부한다', () => {
    expect(createUserSchema.safeParse({ ...VALID, bio: 'a'.repeat(501) }).success).toBe(false);
  });

  it('이미지 data URL avatar를 받는다', () => {
    expect(createUserSchema.safeParse({ ...VALID, avatar: 'data:image/png;base64,AAAA' }).success).toBe(true);
  });

  it('이미지 data URL이 아닌 avatar는 거부한다', () => {
    expect(createUserSchema.safeParse({ ...VALID, avatar: 'https://evil.example/a.png' }).success).toBe(false);
  });

  it('상한을 넘는 avatar는 거부한다', () => {
    const avatar = `data:image/png;base64,${'A'.repeat(AVATAR_MAX_LENGTH)}`;
    expect(createUserSchema.safeParse({ ...VALID, avatar }).success).toBe(false);
  });

  it('avatar·bio가 없어도 통과한다', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { avatar: _a, bio: _b, ...rest } = VALID;
    expect(createUserSchema.safeParse(rest).success).toBe(true);
  });
});
