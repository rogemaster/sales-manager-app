import { describe, it, expect } from 'vitest';
import { profileEditSchema } from './profileEditSchema';

const VALID = { name: '홍길동', phone: '010-1234-5678', company: '회사', bio: '' };

describe('profileEditSchema', () => {
  it('유효한 본문을 통과시킨다', () => {
    expect(profileEditSchema.safeParse(VALID).success).toBe(true);
  });

  it('이름이 없으면 거부한다 — 필드 누락이 500이 되지 않게', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _, ...rest } = VALID;
    expect(profileEditSchema.safeParse(rest).success).toBe(false);
  });

  it('연락처 형식이 틀리면 거부한다', () => {
    expect(profileEditSchema.safeParse({ ...VALID, phone: '12' }).success).toBe(false);
  });

  it('회사명이 100자, 소개가 500자를 넘으면 거부한다', () => {
    expect(profileEditSchema.safeParse({ ...VALID, company: 'a'.repeat(101) }).success).toBe(false);
    expect(profileEditSchema.safeParse({ ...VALID, bio: 'a'.repeat(501) }).success).toBe(false);
  });

  it('company·bio가 없어도 통과한다', () => {
    expect(profileEditSchema.safeParse({ name: '홍길동', phone: '010-1234-5678' }).success).toBe(true);
  });
});
