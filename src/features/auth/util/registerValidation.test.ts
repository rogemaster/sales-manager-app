import { describe, it, expect } from 'vitest';
import { registerBaseSchema, registerSchema } from './registerValidation';

const VALID = {
  email: 'owner@example.com',
  password: 'abcd1234!',
  companyName: '상호',
  representativeName: '대표',
  businessNumber: '123-45-67890',
  businessCategory: '도소매',
  contactName: '담당',
  contactEmail: 'contact@example.com',
  contactPhone: '010-1234-5678',
  settlementName: '',
  settlementEmail: '',
  settlementPhone: '',
};

describe('registerBaseSchema (서버)', () => {
  it('유효한 본문을 통과시키고 businessLicenseName 기본값을 채운다', () => {
    const result = registerBaseSchema.parse(VALID);
    expect(result.businessLicenseName).toBe('');
  });

  it('passwordConfirm 없이 통과한다', () => {
    expect(registerBaseSchema.safeParse(VALID).success).toBe(true);
  });

  it('필수 필드가 없으면 거부한다', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { companyName: _, ...rest } = VALID;
    expect(registerBaseSchema.safeParse(rest).success).toBe(false);
  });

  it('짧은 텍스트가 100자를 넘으면 거부한다', () => {
    expect(registerBaseSchema.safeParse({ ...VALID, companyName: 'a'.repeat(101) }).success).toBe(false);
  });

  it('이메일이 254자를 넘으면 거부한다', () => {
    const email = `${'a'.repeat(250)}@a.com`;
    expect(registerBaseSchema.safeParse({ ...VALID, email }).success).toBe(false);
  });

  it('비밀번호가 100자를 넘으면 거부한다', () => {
    expect(registerBaseSchema.safeParse({ ...VALID, password: `a1!${'b'.repeat(98)}` }).success).toBe(false);
  });
});

describe('registerSchema (화면)', () => {
  it('비밀번호 확인이 다르면 passwordConfirm 경로로 거부한다', () => {
    const result = registerSchema.safeParse({ ...VALID, passwordConfirm: 'different1!' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['passwordConfirm']);
  });

  it('비밀번호 확인이 같으면 통과한다', () => {
    expect(registerSchema.safeParse({ ...VALID, passwordConfirm: VALID.password }).success).toBe(true);
  });
});
